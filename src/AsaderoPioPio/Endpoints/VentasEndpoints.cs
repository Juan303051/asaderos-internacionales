using System.Security.Claims;
using AsaderoPioPio.Data;
using AsaderoPioPio.Seguridad;
using static AsaderoPioPio.Endpoints.Ayudas;

namespace AsaderoPioPio.Endpoints;

public record ItemVentaDto(int PresentacionId, int Cantidad);
public record VentaDto(List<ItemVentaDto>? Items, string? MetodoPago, string? Nota);

/// <summary>Ventas (salidas de pollos): registrar, consultar y anular.</summary>
public static class VentasEndpoints
{
    public static readonly string[] MetodosDePago = ["efectivo", "transferencia", "tarjeta"];

    public static void MapVentas(this WebApplication app)
    {
        var api = app.MapGroup("/api").RequireAuthorization();

        // ---------- Registrar una venta ----------
        api.MapPost("/ventas", async (VentaDto d, Db db, ClaimsPrincipal u) =>
        {
            var items = (d.Items ?? [])
                .Where(i => i.Cantidad > 0)
                .GroupBy(i => i.PresentacionId)
                .Select(g => new ItemVentaDto(g.Key, g.Sum(i => i.Cantidad)))
                .ToList();
            if (items.Count == 0) return Error("Agrega al menos una presentación.");
            if (items.Any(i => i.Cantidad > 500)) return Error("Cantidad demasiado grande en una sola venta.");
            var metodo = d.MetodoPago ?? "efectivo";
            if (!MetodosDePago.Contains(metodo)) return Error("Elige cómo pagó el cliente.");
            var nota = Recortar(d.Nota, 120);

            return await db.EnTransaccionAsync<IResult>(async s =>
            {
                // Candado: dos cajas registrando al tiempo no pueden vender el mismo último pollo.
                await s.EjecutarAsync("SELECT pg_advisory_xact_lock(@l)", ("l", CandadoInventario));

                var precios = (await s.ListaAsync(
                    "SELECT id, precio, equivalente_pollos FROM presentaciones WHERE activa",
                    f => new { Id = f.Entero("id"), Precio = f.Decimal("precio"), Eq = f.Decimal("equivalente_pollos") }))
                    .ToDictionary(p => p.Id);
                if (items.Any(i => !precios.ContainsKey(i.PresentacionId)))
                    return Error("Una de las presentaciones ya no está disponible. Recarga la página.");

                // El servidor calcula los totales: el navegador no puede cambiar precios.
                var pollos = items.Sum(i => precios[i.PresentacionId].Eq * i.Cantidad);
                var total = items.Sum(i => precios[i.PresentacionId].Precio * i.Cantidad);

                var disponibles = await s.EscalarAsync<decimal>("SELECT disponibles FROM v_stock");
                if (pollos > disponibles)
                    return Error($"No alcanzan los pollos: quedan {Num(disponibles)}", 409);

                var ventaId = await s.EscalarAsync<int>("""
                    INSERT INTO ventas (fecha, total, pollos, usuario_id, metodo_pago, nota)
                    VALUES (@f, @t, @p, @u, @m, @n) RETURNING id
                    """, ("f", Hoy()), ("t", total), ("p", pollos), ("u", u.UsuarioId()), ("m", metodo), ("n", nota));

                foreach (var i in items)
                    await s.EjecutarAsync("""
                        INSERT INTO venta_detalle (venta_id, presentacion_id, cantidad, precio_unitario, equivalente_pollos)
                        VALUES (@v, @p, @c, @pr, @e)
                        """, ("v", ventaId), ("p", i.PresentacionId), ("c", i.Cantidad),
                             ("pr", precios[i.PresentacionId].Precio), ("e", precios[i.PresentacionId].Eq));

                return Results.Ok(new { id = ventaId, total, pollos, metodo });
            });
        }).RequireAuthorization(Permisos.Vender);

        // ---------- Consultar las ventas de un día ----------
        // Quien puede "ver las ventas de todos" elige el día; el cajero ve solo las suyas de hoy.
        api.MapGet("/ventas", async (string? fecha, Db db, ClaimsPrincipal u) =>
        {
            var verTodas = u.Puede(Permisos.VerVentasTodas);
            var dia = Hoy();
            if (verTodas && !string.IsNullOrEmpty(fecha))
            {
                if (!TryFecha(fecha, out dia)) return Error("La fecha no es válida.");
            }

            var ventas = await db.ListaAsync("""
                SELECT v.id, v.creado_en, v.total, v.pollos, v.metodo_pago, v.nota, v.anulada,
                       COALESCE(us.nombre, '—') AS vendedor,
                       COALESCE((SELECT STRING_AGG(d.cantidad || 'x ' || p.nombre, ', ' ORDER BY p.orden)
                                   FROM venta_detalle d JOIN presentaciones p ON p.id = d.presentacion_id
                                  WHERE d.venta_id = v.id), '') AS detalle
                  FROM ventas v LEFT JOIN usuarios us ON us.id = v.usuario_id
                 WHERE v.fecha = @d AND (@todas OR v.usuario_id = @u)
                 ORDER BY v.creado_en DESC, v.id DESC LIMIT 300
                """,
                f => new
                {
                    id = f.Entero("id"), hora = f.Hora("creado_en"), total = f.Decimal("total"), pollos = f.Decimal("pollos"),
                    metodo = f.Texto("metodo_pago"), nota = f.Texto("nota"), anulada = f.Booleano("anulada"),
                    vendedor = f.Texto("vendedor"), detalle = f.Texto("detalle"),
                },
                ("d", dia), ("todas", verTodas), ("u", u.UsuarioId()));

            var vigentes = ventas.Where(v => !v.anulada).ToList();
            return Results.Ok(new
            {
                fecha = dia.ToString("yyyy-MM-dd"),
                alcance = verTodas ? "todas" : "propias",
                ventas,
                totales = new { valor = vigentes.Sum(v => v.total), pollos = vigentes.Sum(v => v.pollos), cantidad = vigentes.Count },
            });
        });

        // ---------- Anular una venta equivocada (los pollos vuelven al inventario) ----------
        api.MapPost("/ventas/{id:int}/anular", async (int id, Db db, ClaimsPrincipal u) =>
        {
            var anuladas = await db.ListaAsync("""
                UPDATE ventas SET anulada = TRUE, anulada_en = NOW(), anulada_por = @u
                 WHERE id = @id AND NOT anulada
                RETURNING total, pollos
                """, f => new { total = f.Decimal("total"), pollos = f.Decimal("pollos") },
                ("id", id), ("u", u.UsuarioId()));
            if (anuladas.Count == 0) return Error("La venta no existe o ya estaba anulada.", 404);
            await db.Registrar(u, "venta_anulada", $"Anuló la venta #{id} ({Dinero(anuladas[0].total)}, {Num(anuladas[0].pollos)} pollos).");
            return Results.Ok(new { ok = true });
        }).RequireAuthorization(Permisos.AnularVentas);
    }
}
