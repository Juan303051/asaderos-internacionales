using System.Security.Claims;
using AsaderoPioPio.Data;
using AsaderoPioPio.Seguridad;
using static AsaderoPioPio.Endpoints.Ayudas;

namespace AsaderoPioPio.Endpoints;

public record PresentacionDto(string? Nombre, decimal? Precio, decimal? Equivalente, bool? Activa);
public record GastoDto(string? Concepto, string? Categoria, decimal? Valor, string? Metodo, string? Fecha);
public record CierreDto(decimal? Base, decimal? Contado, string? Nota);
public record ResumenDia(decimal Efectivo, decimal Transferencia, decimal Tarjeta, decimal Total, int Ventas, decimal GastosEfectivo);

/// <summary>Productos y precios, gastos y cierre de caja: la parte del dinero del negocio.</summary>
public static class NegocioEndpoints
{
    private static readonly string[] Categorias = ["combustible", "servicios", "empaques", "nomina", "mantenimiento", "otros"];

    public static void MapNegocio(this WebApplication app)
    {
        var api = app.MapGroup("/api").RequireAuthorization();

        // =========================== PRODUCTOS Y PRECIOS (solo admin) ===========================
        api.MapGet("/presentaciones", async (Db db) =>
            Results.Ok(await db.ListaAsync(
                "SELECT id, nombre, precio, equivalente_pollos, activa FROM presentaciones ORDER BY activa DESC, orden, id",
                f => new { id = f.Entero("id"), nombre = f.Texto("nombre"), precio = f.Decimal("precio"),
                           equivalente = f.Decimal("equivalente_pollos"), activa = f.Booleano("activa") })))
            .RequireAuthorization(Permisos.GestionarPrecios);

        api.MapPost("/presentaciones", async (PresentacionDto d, Db db, ClaimsPrincipal u) =>
        {
            if (Validar(d) is { } problema) return problema;
            var nombre = Recortar(d.Nombre, 60);
            if (await db.EscalarAsync<long>("SELECT COUNT(*) FROM presentaciones WHERE LOWER(nombre) = LOWER(@n)", ("n", nombre)) > 0)
                return Error("Ya existe un producto con ese nombre.", 409);
            var id = await db.EscalarAsync<int>("""
                INSERT INTO presentaciones (nombre, precio, equivalente_pollos, orden)
                VALUES (@n, @p, @e, COALESCE((SELECT MAX(orden) FROM presentaciones), 0) + 1) RETURNING id
                """, ("n", nombre), ("p", d.Precio), ("e", d.Equivalente));
            await db.Registrar(u, "producto_creado", $"Creó «{nombre}» a {Dinero(d.Precio!.Value)} (descuenta {Num(d.Equivalente!.Value)} pollo).");
            return Results.Ok(new { id });
        }).RequireAuthorization(Permisos.GestionarPrecios);

        api.MapPut("/presentaciones/{id:int}", async (int id, PresentacionDto d, Db db, ClaimsPrincipal u) =>
        {
            if (Validar(d) is { } problema) return problema;
            var nombre = Recortar(d.Nombre, 60);
            var antes = (await db.ListaAsync("SELECT nombre, precio, equivalente_pollos, activa FROM presentaciones WHERE id = @i",
                f => new { nombre = f.Texto("nombre"), precio = f.Decimal("precio"), eq = f.Decimal("equivalente_pollos"), activa = f.Booleano("activa") },
                ("i", id))).FirstOrDefault();
            if (antes is null) return Error("El producto no existe.", 404);
            if (await db.EscalarAsync<long>("SELECT COUNT(*) FROM presentaciones WHERE LOWER(nombre) = LOWER(@n) AND id <> @i", ("n", nombre), ("i", id)) > 0)
                return Error("Ya existe otro producto con ese nombre.", 409);

            var activa = d.Activa ?? antes.activa;
            await db.EjecutarAsync("""
                UPDATE presentaciones SET nombre = @n, precio = @p, equivalente_pollos = @e, activa = @a WHERE id = @i
                """, ("n", nombre), ("p", d.Precio), ("e", d.Equivalente), ("a", activa), ("i", id));

            var cambios = new List<string>();
            if (antes.nombre != nombre) cambios.Add($"nombre «{antes.nombre}» → «{nombre}»");
            if (antes.precio != d.Precio) cambios.Add($"precio {Dinero(antes.precio)} → {Dinero(d.Precio!.Value)}");
            if (antes.eq != d.Equivalente) cambios.Add($"descuenta {Num(antes.eq)} → {Num(d.Equivalente!.Value)} pollo");
            if (antes.activa != activa) cambios.Add(activa ? "lo volvió a mostrar en ventas" : "lo ocultó de ventas");
            if (cambios.Count > 0)
                await db.Registrar(u, "producto_editado", $"«{antes.nombre}»: {string.Join("; ", cambios)}.");
            return Results.Ok(new { ok = true });
        }).RequireAuthorization(Permisos.GestionarPrecios);

        // =========================== GASTOS (solo admin) ===========================
        api.MapGet("/gastos", async (int? dias, Db db) =>
        {
            var d = Math.Clamp(dias ?? 30, 1, 365);
            var gastos = await db.ListaAsync("""
                SELECT g.id, TO_CHAR(g.fecha, 'YYYY-MM-DD') AS fecha, g.concepto, g.categoria, g.valor, g.metodo,
                       COALESCE(us.nombre, '—') AS usuario
                  FROM gastos g LEFT JOIN usuarios us ON us.id = g.usuario_id
                 WHERE NOT g.anulado AND g.fecha >= @d
                 ORDER BY g.fecha DESC, g.id DESC LIMIT 300
                """,
                f => new { id = f.Entero("id"), fecha = f.Texto("fecha"), concepto = f.Texto("concepto"), categoria = f.Texto("categoria"),
                           valor = f.Decimal("valor"), metodo = f.Texto("metodo"), usuario = f.Texto("usuario") },
                ("d", Hoy().AddDays(-(d - 1))));
            return Results.Ok(new { dias = d, gastos, total = gastos.Sum(g => g.valor) });
        }).RequireAuthorization(Permisos.GestionarGastos);

        api.MapPost("/gastos", async (GastoDto d, Db db, ClaimsPrincipal u) =>
        {
            var concepto = Recortar(d.Concepto, 120);
            if (concepto.Length < 3) return Error("Escribe en qué se gastó (mínimo 3 letras).");
            if (d.Categoria is null || !Categorias.Contains(d.Categoria)) return Error("Elige la categoría del gasto.");
            if (d.Valor is not { } valor || valor <= 0 || valor > 1_000_000_000) return Error("El valor del gasto debe ser mayor que 0.");
            var metodo = d.Metodo ?? "efectivo";
            if (metodo is not ("efectivo" or "transferencia")) return Error("Elige si se pagó en efectivo o por transferencia.");
            if (!TryFecha(d.Fecha, out var fecha)) return Error("La fecha no es válida.");
            if (fecha > Hoy()) return Error("La fecha no puede estar en el futuro.");

            var id = await db.EscalarAsync<int>("""
                INSERT INTO gastos (fecha, concepto, categoria, valor, metodo, usuario_id)
                VALUES (@f, @c, @k, @v, @m, @u) RETURNING id
                """, ("f", fecha), ("c", concepto), ("k", d.Categoria), ("v", valor), ("m", metodo), ("u", u.UsuarioId()));
            await db.Registrar(u, "gasto", $"Gasto #{id}: {concepto} ({d.Categoria}) por {Dinero(valor)} en {metodo}.");
            return Results.Ok(new { id });
        }).RequireAuthorization(Permisos.GestionarGastos);

        api.MapPost("/gastos/{id:int}/anular", async (int id, Db db, ClaimsPrincipal u) =>
        {
            var anulados = await db.ListaAsync("""
                UPDATE gastos SET anulado = TRUE, anulado_en = NOW(), anulado_por = @u
                 WHERE id = @id AND NOT anulado RETURNING concepto, valor
                """, f => new { concepto = f.Texto("concepto"), valor = f.Decimal("valor") }, ("id", id), ("u", u.UsuarioId()));
            if (anulados.Count == 0) return Error("El gasto no existe o ya estaba anulado.", 404);
            await db.Registrar(u, "gasto_anulado", $"Anuló el gasto #{id}: {anulados[0].concepto} ({Dinero(anulados[0].valor)}).");
            return Results.Ok(new { ok = true });
        }).RequireAuthorization(Permisos.GestionarGastos);

        // =========================== CIERRE DE CAJA (admin y supervisor) ===========================
        api.MapGet("/caja", async (Db db) =>
        {
            var hoy = Hoy();
            var resumen = await ResumenDelDia(db, hoy);
            var cierres = await db.ListaAsync("""
                SELECT c.id, TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha, c.creado_en, c.base, c.esperado, c.contado, c.diferencia, c.nota,
                       COALESCE(us.nombre, '—') AS usuario
                  FROM cierres_caja c LEFT JOIN usuarios us ON us.id = c.usuario_id
                 ORDER BY c.creado_en DESC, c.id DESC LIMIT 15
                """,
                f => new { id = f.Entero("id"), fecha = f.Texto("fecha"), hora = f.Hora("creado_en"), @base = f.Decimal("base"),
                           esperado = f.Decimal("esperado"), contado = f.Decimal("contado"), diferencia = f.Decimal("diferencia"),
                           nota = f.Texto("nota"), usuario = f.Texto("usuario") });
            return Results.Ok(new { fecha = hoy.ToString("yyyy-MM-dd"), resumen, cierres });
        }).RequireAuthorization(Permisos.CerrarCaja);

        api.MapPost("/caja/cierres", async (CierreDto d, Db db, ClaimsPrincipal u) =>
        {
            if (d.Base is not { } @base || @base < 0 || @base > 1_000_000_000) return Error("La base de caja debe ser 0 o más.");
            if (d.Contado is not { } contado || contado < 0 || contado > 1_000_000_000) return Error("El efectivo contado debe ser 0 o más.");
            var nota = Recortar(d.Nota, 160);

            // El servidor recalcula todo: lo que "debería haber" no lo decide el navegador.
            var r = await ResumenDelDia(db, Hoy());
            var esperado = @base + r.Efectivo - r.GastosEfectivo;
            var diferencia = contado - esperado;

            var id = await db.EscalarAsync<int>("""
                INSERT INTO cierres_caja (fecha, base, ventas_efectivo, ventas_transferencia, ventas_tarjeta, gastos_efectivo,
                                          esperado, contado, diferencia, nota, usuario_id)
                VALUES (@f, @b, @e, @t, @c, @g, @x, @n, @d, @o, @u) RETURNING id
                """, ("f", Hoy()), ("b", @base), ("e", r.Efectivo), ("t", r.Transferencia), ("c", r.Tarjeta), ("g", r.GastosEfectivo),
                     ("x", esperado), ("n", contado), ("d", diferencia), ("o", nota), ("u", u.UsuarioId()));
            await db.Registrar(u, "cierre_caja",
                $"Cierre #{id}: esperado {Dinero(esperado)}, contado {Dinero(contado)}, diferencia {(diferencia >= 0 ? "+" : "−")}{Dinero(Math.Abs(diferencia))}.");
            return Results.Ok(new { id, esperado, contado, diferencia });
        }).RequireAuthorization(Permisos.CerrarCaja);
    }

    /// <summary>Lo vendido por cada forma de pago y lo gastado en efectivo durante el día.</summary>
    private static async Task<ResumenDia> ResumenDelDia(Db db, DateOnly dia)
    {
        var filas = await db.ListaAsync("""
            SELECT metodo_pago, COALESCE(SUM(total), 0) AS valor, COUNT(*) AS cantidad
              FROM ventas WHERE fecha = @d AND NOT anulada GROUP BY metodo_pago
            """, f => new { metodo = f.Texto("metodo_pago"), valor = f.Decimal("valor"), cantidad = f.Entero("cantidad") }, ("d", dia));
        decimal Suma(string m) => filas.Where(x => x.metodo == m).Sum(x => x.valor);
        var gastos = await db.EscalarAsync<decimal>(
            "SELECT COALESCE(SUM(valor), 0) FROM gastos WHERE fecha = @d AND NOT anulado AND metodo = 'efectivo'", ("d", dia));
        return new ResumenDia(Suma("efectivo"), Suma("transferencia"), Suma("tarjeta"), filas.Sum(x => x.valor), filas.Sum(x => x.cantidad), gastos);
    }

    private static IResult? Validar(PresentacionDto d)
    {
        if (Recortar(d.Nombre, 60).Length < 2) return Error("Escribe el nombre del producto (mínimo 2 letras).");
        if (d.Precio is not { } p || p <= 0 || p > 100_000_000) return Error("El precio debe ser mayor que 0.");
        if (d.Equivalente is not { } e || e <= 0 || e > 20 || !EsMultiploDeCuarto(e))
            return Error("Los pollos que descuenta deben ir en cuartos: 0,25 · 0,5 · 1 · 1,5…");
        return null;
    }
}
