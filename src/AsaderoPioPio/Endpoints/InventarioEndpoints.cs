using System.Globalization;
using System.Security.Claims;
using AsaderoPioPio.Data;
using AsaderoPioPio.Seguridad;
using static AsaderoPioPio.Endpoints.Ayudas;

namespace AsaderoPioPio.Endpoints;

public record StockMinimoDto(decimal? Valor);
public record CompraDto(decimal? Cantidad, decimal? CostoUnitario, string? Proveedor, string? Fecha);
public record DevolucionCompraDto(decimal? Cantidad, string? Motivo);
public record AjusteDto(string? Tipo, decimal? Cantidad, string? Motivo);

/// <summary>
/// Inventario de pollos. Ver las existencias lo puede hacer cualquier usuario con sesión;
/// MODIFICARLAS (compras, devoluciones, ajustes, stock mínimo) exige el permiso
/// "gestionar_inventario", que solo tiene el administrador.
/// </summary>
public static class InventarioEndpoints
{
    // Tipos de ajuste y su efecto sobre el inventario (-1 resta, +1 suma)
    private static readonly Dictionary<string, int> TiposAjuste = new()
    {
        ["merma"] = -1, ["consumo"] = -1, ["donacion"] = -1, ["conteo_menos"] = -1, ["conteo_mas"] = 1,
    };

    public static void MapInventario(this WebApplication app)
    {
        var api = app.MapGroup("/api").RequireAuthorization();

        // ---------- Todo lo que necesita la pantalla de inicio en una sola llamada ----------
        api.MapGet("/resumen", async (Db db, ClaimsPrincipal u) =>
        {
            var hoy = Hoy();
            var verTodas = u.Puede(Permisos.VerVentasTodas);
            var verCostos = u.Puede(Permisos.VerCostos);
            var yo = u.UsuarioId();
            await using var s = await db.AbrirAsync();

            var stock = await s.EscalarAsync<decimal>("SELECT disponibles FROM v_stock");
            var minimo = await LeerStockMinimo(s);

            // Quien no ve las ventas de todos, ve solo las suyas ("Mi turno").
            const string sqlVentas = """
                SELECT COALESCE(SUM(total), 0) AS valor, COALESCE(SUM(pollos), 0) AS pollos, COUNT(*) AS cantidad
                  FROM ventas WHERE fecha = @f AND NOT anulada AND (@todas OR usuario_id = @u)
                """;
            var ventasHoy = (await s.ListaAsync(sqlVentas,
                f => new { valor = f.Decimal("valor"), pollos = f.Decimal("pollos"), cantidad = f.Entero("cantidad") },
                ("f", hoy), ("todas", verTodas), ("u", yo)))[0];
            var ventasAyer = (await s.ListaAsync(sqlVentas,
                f => new { valor = f.Decimal("valor"), pollos = f.Decimal("pollos"), cantidad = f.Entero("cantidad") },
                ("f", hoy.AddDays(-1)), ("todas", verTodas), ("u", yo)))[0];

            // Ritmo de venta de los últimos 7 días → cuántos días alcanza el inventario.
            var ritmo = await s.EscalarAsync<decimal>(
                "SELECT COALESCE(SUM(pollos), 0) / 7 FROM ventas WHERE NOT anulada AND fecha BETWEEN @d AND @h",
                ("d", hoy.AddDays(-6)), ("h", hoy));
            decimal? diasRestantes = ritmo > 0 ? Math.Round(stock / ritmo, 1) : null;

            var masVendidos = await s.ListaAsync("""
                SELECT p.nombre, SUM(d.cantidad) AS cantidad
                  FROM venta_detalle d JOIN ventas v ON v.id = d.venta_id JOIN presentaciones p ON p.id = d.presentacion_id
                 WHERE v.fecha = @f AND NOT v.anulada AND (@todas OR v.usuario_id = @u)
                 GROUP BY p.nombre ORDER BY cantidad DESC LIMIT 4
                """,
                f => new { nombre = f.Texto("nombre"), cantidad = f.Entero("cantidad") },
                ("f", hoy), ("todas", verTodas), ("u", yo));

            decimal? utilidadHoy = null;
            if (verCostos && verTodas)
            {
                var costo = await s.EscalarAsync<decimal>("SELECT costo FROM v_costo_promedio");
                var gastosHoy = await s.EscalarAsync<decimal>(
                    "SELECT COALESCE(SUM(valor), 0) FROM gastos WHERE fecha = @f AND NOT anulado", ("f", hoy));
                utilidadHoy = ventasHoy.valor - ventasHoy.pollos * costo - gastosHoy;
            }

            var ultimos = await Movimientos(s, 6, verCostos);

            var presentaciones = await s.ListaAsync(
                "SELECT id, nombre, precio, equivalente_pollos FROM presentaciones WHERE activa ORDER BY orden, id",
                f => new { id = f.Entero("id"), nombre = f.Texto("nombre"), precio = f.Decimal("precio"),
                           equivalente = f.Decimal("equivalente_pollos") });

            return Results.Ok(new
            {
                hoy = hoy.ToString("yyyy-MM-dd"),
                usuario = AuthEndpoints.Perfil(u),
                alcance = verTodas ? "todas" : "propias",
                stock, stockMinimo = minimo, diasRestantes,
                ventasHoy, ventasAyer, masVendidos, utilidadHoy, ultimos, presentaciones,
            });
        });

        // ---------- Historial de movimientos (kardex) ----------
        api.MapGet("/movimientos", async (int? limite, Db db, ClaimsPrincipal u) =>
        {
            await using var s = await db.AbrirAsync();
            return Results.Ok(await Movimientos(s, Math.Clamp(limite ?? 40, 1, 200), u.Puede(Permisos.VerCostos)));
        });

        // ---------- Stock mínimo (alerta roja) ----------
        api.MapPut("/configuracion/stock-minimo", async (StockMinimoDto d, Db db, ClaimsPrincipal u) =>
        {
            if (d.Valor is not { } v || v < 0 || v > 100_000) return Error("El stock mínimo debe ser un número entre 0 y 100.000.");
            await using var s = await db.AbrirAsync();
            var antes = await LeerStockMinimo(s);
            await s.EjecutarAsync("""
                INSERT INTO configuracion (clave, valor) VALUES ('stock_minimo', @v)
                ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor
                """, ("v", v.ToString(CultureInfo.InvariantCulture)));
            await s.Registrar(u, "stock_minimo", $"Cambió el stock mínimo de {Num(antes)} a {Num(v)} pollos.");
            return Results.Ok(new { stockMinimo = v });
        }).RequireAuthorization(Permisos.GestionarInventario);

        // ---------- Compras (entradas) ----------
        api.MapGet("/compras", async (Db db) =>
            Results.Ok(await db.ListaAsync("""
                SELECT c.id, TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha, c.cantidad,
                       c.costo_unitario, c.total, c.proveedor,
                       COALESCE(SUM(r.cantidad), 0) AS devueltos,
                       c.cantidad - COALESCE(SUM(r.cantidad), 0) AS disponibles_devolucion
                  FROM compras c LEFT JOIN devoluciones_compra r ON r.compra_id = c.id
                 WHERE NOT c.anulada
                 GROUP BY c.id ORDER BY c.creado_en DESC LIMIT 30
                """,
                f => new { id = f.Entero("id"), fecha = f.Texto("fecha"), cantidad = f.Decimal("cantidad"),
                           costo = f.Decimal("costo_unitario"), total = f.Decimal("total"), proveedor = f.Texto("proveedor"),
                           devueltos = f.Decimal("devueltos"), disponiblesDevolucion = f.Decimal("disponibles_devolucion") })))
            .RequireAuthorization(Permisos.GestionarInventario);

        api.MapPost("/compras", async (CompraDto d, Db db, ClaimsPrincipal u) =>
        {
            if (d.Cantidad is not { } cant || cant <= 0 || cant > 100_000 || cant != Math.Floor(cant))
                return Error("La cantidad debe ser un número entero de pollos mayor que 0.");
            if (d.CostoUnitario is not { } costo || costo <= 0 || costo > 100_000_000)
                return Error("El costo por pollo debe ser mayor que 0.");
            if (!TryFecha(d.Fecha, out var fecha))
                return Error("La fecha no es válida.");
            if (fecha > Hoy().AddDays(1)) return Error("La fecha no puede estar en el futuro.");
            var proveedor = Recortar(d.Proveedor, 120);

            await using var s = await db.AbrirAsync();
            var id = await s.EscalarAsync<int>("""
                INSERT INTO compras (fecha, cantidad, costo_unitario, proveedor, usuario_id)
                VALUES (@f, @q, @c, @p, @u) RETURNING id
                """, ("f", fecha), ("q", cant), ("c", costo), ("p", proveedor), ("u", u.UsuarioId()));
            await s.Registrar(u, "compra", $"Compra #{id}: {Num(cant)} pollos a {Dinero(costo)} c/u (total {Dinero(cant * costo)}). Proveedor: {(proveedor == "" ? "sin nombre" : proveedor)}.");
            return Results.Ok(new { id, pollos = cant, total = cant * costo });
        }).RequireAuthorization(Permisos.GestionarInventario);

        // ---------- Anular una compra completa conservando su registro ----------
        api.MapPost("/compras/{id:int}/anular", async (int id, Db db, ClaimsPrincipal u) =>
        {
            return await db.EnTransaccionAsync<IResult>(async s =>
            {
                await s.EjecutarAsync("SELECT pg_advisory_xact_lock(@l)", ("l", CandadoInventario));
                var compra = await s.ListaAsync("""
                    SELECT cantidad, total FROM compras WHERE id = @id AND NOT anulada FOR UPDATE
                    """, f => new { cantidad = f.Decimal("cantidad"), total = f.Decimal("total") }, ("id", id));
                if (compra.Count == 0) return Error("La compra no existe o ya estaba anulada.", 404);

                var devueltos = await s.EscalarAsync<decimal>(
                    "SELECT COALESCE(SUM(cantidad), 0) FROM devoluciones_compra WHERE compra_id = @id", ("id", id));
                var saldoCompra = compra[0].cantidad - devueltos;
                var disponibles = await s.EscalarAsync<decimal>("SELECT disponibles FROM v_stock");
                if (disponibles < saldoCompra)
                    return Error($"No se puede anular: ya se vendieron o retiraron {Num(saldoCompra - disponibles)} pollos de esta compra.", 409);

                await s.EjecutarAsync("""
                    UPDATE compras SET anulada = TRUE, anulada_en = NOW(), anulada_por = @u
                     WHERE id = @id AND NOT anulada
                    """, ("id", id), ("u", u.UsuarioId()));
                await s.Registrar(u, "compra_anulada", $"Anuló la compra #{id} ({Num(compra[0].cantidad)} pollos, {Dinero(compra[0].total)}).");
                return Results.Ok(new { ok = true });
            });
        }).RequireAuthorization(Permisos.GestionarInventario);

        // ---------- Devolución parcial o total al proveedor ----------
        api.MapPost("/compras/{id:int}/devoluciones", async (int id, DevolucionCompraDto d, Db db, ClaimsPrincipal u) =>
        {
            if (d.Cantidad is not { } cantidad || cantidad <= 0 || cantidad > 100_000 || cantidad != Math.Floor(cantidad))
                return Error("La cantidad devuelta debe ser un número entero mayor que 0.");
            var motivo = (d.Motivo ?? "").Trim();
            if (motivo.Length > 160) return Error("El motivo no puede superar 160 caracteres.");

            return await db.EnTransaccionAsync<IResult>(async s =>
            {
                await s.EjecutarAsync("SELECT pg_advisory_xact_lock(@l)", ("l", CandadoInventario));
                var compras = await s.ListaAsync("""
                    SELECT cantidad, costo_unitario FROM compras WHERE id = @id AND NOT anulada FOR UPDATE
                    """, f => new { cantidad = f.Decimal("cantidad"), costo = f.Decimal("costo_unitario") }, ("id", id));
                if (compras.Count == 0) return Error("La compra no existe o ya está anulada.", 404);

                var devueltos = await s.EscalarAsync<decimal>(
                    "SELECT COALESCE(SUM(cantidad), 0) FROM devoluciones_compra WHERE compra_id = @id", ("id", id));
                var saldoCompra = compras[0].cantidad - devueltos;
                if (cantidad > saldoCompra)
                    return Error($"De esta compra solo quedan {Num(saldoCompra)} pollos por devolver.", 409);

                var disponibles = await s.EscalarAsync<decimal>("SELECT disponibles FROM v_stock");
                if (cantidad > disponibles)
                    return Error($"No puedes devolver pollos que ya salieron del inventario. Disponibles: {Num(disponibles)}.", 409);

                var devolucionId = await s.EscalarAsync<int>("""
                    INSERT INTO devoluciones_compra (compra_id, fecha, cantidad, total, motivo, usuario_id)
                    VALUES (@id, @fecha, @cantidad, @total, @motivo, @usuario) RETURNING id
                    """, ("id", id), ("fecha", Hoy()), ("cantidad", cantidad),
                    ("total", cantidad * compras[0].costo), ("motivo", motivo), ("usuario", u.UsuarioId()));
                await s.Registrar(u, "devolucion", $"Devolvió {Num(cantidad)} pollos de la compra #{id}. Motivo: {(motivo == "" ? "sin motivo" : motivo)}.");
                return Results.Ok(new { id = devolucionId, pollos = cantidad });
            });
        }).RequireAuthorization(Permisos.GestionarInventario);

        // ---------- Ajustes: mermas, consumo del personal, donaciones y conteo físico ----------
        api.MapPost("/ajustes", async (AjusteDto d, Db db, ClaimsPrincipal u) =>
        {
            if (d.Tipo is null || !TiposAjuste.TryGetValue(d.Tipo, out var signo))
                return Error("Elige el tipo de ajuste.");
            if (d.Cantidad is not { } cant || cant <= 0 || cant > 100_000 || !EsMultiploDeCuarto(cant))
                return Error("La cantidad debe ser mayor que 0 y en cuartos de pollo (0,25 · 0,5 · 1 · 1,5…).");
            var motivo = Recortar(d.Motivo, 160);
            if (motivo.Length < 3) return Error("Escribe el motivo del ajuste (mínimo 3 letras).");

            return await db.EnTransaccionAsync<IResult>(async s =>
            {
                await s.EjecutarAsync("SELECT pg_advisory_xact_lock(@l)", ("l", CandadoInventario));
                if (signo < 0)
                {
                    var disponibles = await s.EscalarAsync<decimal>("SELECT disponibles FROM v_stock");
                    if (cant > disponibles) return Error($"No puedes retirar {Num(cant)}: solo hay {Num(disponibles)} pollos.", 409);
                }
                var id = await s.EscalarAsync<int>("""
                    INSERT INTO ajustes_inventario (fecha, tipo, cantidad, motivo, usuario_id)
                    VALUES (@f, @t, @c, @m, @u) RETURNING id
                    """, ("f", Hoy()), ("t", d.Tipo), ("c", cant * signo), ("m", motivo), ("u", u.UsuarioId()));
                await s.Registrar(u, "ajuste", $"Ajuste #{id} ({d.Tipo}): {(signo < 0 ? "−" : "+")}{Num(cant)} pollos. Motivo: {motivo}.");
                return Results.Ok(new { id, pollos = cant * signo });
            });
        }).RequireAuthorization(Permisos.GestionarInventario);
    }

    private static async Task<decimal> LeerStockMinimo(Sesion s)
        => decimal.Parse(
            await s.EscalarAsync<string>("SELECT valor FROM configuracion WHERE clave = 'stock_minimo'") ?? "5",
            CultureInfo.InvariantCulture);

    /// <summary>Últimos movimientos del inventario. Los valores en dinero solo se envían a quien puede ver costos.</summary>
    private static Task<List<object>> Movimientos(Sesion s, int limite, bool verValores)
        => s.ListaAsync("""
            SELECT m.tipo, m.id, TO_CHAR(m.fecha, 'YYYY-MM-DD') AS fecha, m.creado_en, m.pollos, m.total, m.nota,
                   COALESCE(us.nombre, '—') AS usuario
              FROM v_movimientos m LEFT JOIN usuarios us ON us.id = m.usuario_id
             ORDER BY m.creado_en DESC, m.id DESC LIMIT @l
            """,
            f => (object)new
            {
                tipo = f.Texto("tipo"), id = f.Entero("id"), fecha = f.Texto("fecha"), hora = f.Hora("creado_en"),
                pollos = f.Decimal("pollos"), valor = verValores ? f.Decimal("total") : (decimal?)null,
                nota = f.Texto("nota"), usuario = f.Texto("usuario"),
            }, ("l", limite));
}
