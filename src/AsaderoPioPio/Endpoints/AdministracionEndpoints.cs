using System.Security.Claims;
using System.Text.RegularExpressions;
using AsaderoPioPio.Data;
using AsaderoPioPio.Seguridad;
using static AsaderoPioPio.Endpoints.Ayudas;

namespace AsaderoPioPio.Endpoints;

public record UsuarioNuevoDto(string? Nombre, string? Correo, string? Clave, string? Rol);
public record UsuarioEditarDto(string? Nombre, string? Rol, bool? Activo);
public record ClaveDto(string? Clave);

/// <summary>Reportes, equipo (usuarios y roles) y bitácora de auditoría.</summary>
public static partial class AdministracionEndpoints
{
    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex CorreoValido();

    public static void MapAdministracion(this WebApplication app)
    {
        var api = app.MapGroup("/api").RequireAuthorization();

        // =========================== REPORTES (admin y supervisor) ===========================
        api.MapGet("/reportes", async (int? dias, Db db, ClaimsPrincipal u) =>
        {
            var n = dias is 7 or 15 or 30 ? dias.Value : 7;
            var hasta = Hoy();
            var desde = hasta.AddDays(-(n - 1));
            await using var s = await db.AbrirAsync();

            var serie = await s.ListaAsync("""
                SELECT TO_CHAR(g.dia, 'YYYY-MM-DD') AS fecha,
                       COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.fecha = g.dia AND NOT v.anulada), 0) AS ventas,
                       COALESCE((SELECT SUM(c.total) FROM compras c WHERE c.fecha = g.dia AND NOT c.anulada), 0)
                       - COALESCE((SELECT SUM(r.total) FROM devoluciones_compra r JOIN compras c ON c.id = r.compra_id WHERE r.fecha = g.dia AND NOT c.anulada), 0) AS compras,
                       COALESCE((SELECT SUM(x.valor) FROM gastos x WHERE x.fecha = g.dia AND NOT x.anulado), 0) AS gastos
                  FROM (SELECT (@h::date - k) AS dia FROM GENERATE_SERIES(@n - 1, 0, -1) AS k) g
                 ORDER BY g.dia
                """,
                f => new { fecha = f.Texto("fecha"), ventas = f.Decimal("ventas"), compras = f.Decimal("compras"), gastos = f.Decimal("gastos") },
                ("h", hasta), ("n", n));

            var resumen = (await s.ListaAsync("""
                SELECT COALESCE(SUM(total), 0) AS valor, COALESCE(SUM(pollos), 0) AS pollos, COUNT(*) AS cantidad
                  FROM ventas WHERE NOT anulada AND fecha BETWEEN @d AND @h
                """, f => new { valor = f.Decimal("valor"), pollos = f.Decimal("pollos"), cantidad = f.Entero("cantidad") },
                ("d", desde), ("h", hasta)))[0];

            var costo = await s.EscalarAsync<decimal>("SELECT costo FROM v_costo_promedio");
            var gastos = serie.Sum(x => x.gastos);
            var pollosRetirados = await s.EscalarAsync<decimal>(
                "SELECT COALESCE(-SUM(cantidad), 0) FROM ajustes_inventario WHERE cantidad < 0 AND fecha BETWEEN @d AND @h",
                ("d", desde), ("h", hasta));
            var perdidas = pollosRetirados * costo;       // mermas, consumo y donaciones valorados al costo
            var costoVendido = resumen.pollos * costo;
            var utilidad = resumen.valor - costoVendido - gastos - perdidas;

            var porPresentacion = await s.ListaAsync("""
                SELECT p.nombre, SUM(d.cantidad) AS cantidad, SUM(d.cantidad * d.precio_unitario) AS valor
                  FROM venta_detalle d JOIN ventas v ON v.id = d.venta_id JOIN presentaciones p ON p.id = d.presentacion_id
                 WHERE NOT v.anulada AND v.fecha BETWEEN @d AND @h
                 GROUP BY p.nombre ORDER BY valor DESC
                """, f => new { nombre = f.Texto("nombre"), cantidad = f.Entero("cantidad"), valor = f.Decimal("valor") },
                ("d", desde), ("h", hasta));

            var porMetodo = await s.ListaAsync("""
                SELECT metodo_pago, SUM(total) AS valor, COUNT(*) AS cantidad
                  FROM ventas WHERE NOT anulada AND fecha BETWEEN @d AND @h GROUP BY metodo_pago ORDER BY valor DESC
                """, f => new { metodo = f.Texto("metodo_pago"), valor = f.Decimal("valor"), cantidad = f.Entero("cantidad") },
                ("d", desde), ("h", hasta));

            var porVendedor = await s.ListaAsync("""
                SELECT COALESCE(us.nombre, '—') AS nombre, SUM(v.total) AS valor, COUNT(*) AS cantidad
                  FROM ventas v LEFT JOIN usuarios us ON us.id = v.usuario_id
                 WHERE NOT v.anulada AND v.fecha BETWEEN @d AND @h GROUP BY us.nombre ORDER BY valor DESC
                """, f => new { nombre = f.Texto("nombre"), valor = f.Decimal("valor"), cantidad = f.Entero("cantidad") },
                ("d", desde), ("h", hasta));

            return Results.Ok(new
            {
                dias = n, desde = desde.ToString("yyyy-MM-dd"), hasta = hasta.ToString("yyyy-MM-dd"),
                serie,
                totales = new
                {
                    ventas = resumen.valor, pollosVendidos = resumen.pollos, numVentas = resumen.cantidad,
                    ticketPromedio = resumen.cantidad > 0 ? Math.Round(resumen.valor / resumen.cantidad) : 0,
                    compras = serie.Sum(x => x.compras), gastos, costoVendido, perdidas, utilidad, costoPorPollo = costo,
                },
                porPresentacion, porMetodo, porVendedor,
            });
        }).RequireAuthorization(Permisos.VerReportes);

        // =========================== EQUIPO: USUARIOS Y ROLES (solo admin) ===========================
        api.MapGet("/usuarios", async (Db db, ClaimsPrincipal u) =>
            Results.Ok(await db.ListaAsync("""
                SELECT id, nombre, correo, rol, activo, ultimo_ingreso, debe_cambiar_clave
                  FROM usuarios ORDER BY activo DESC, rol, nombre
                """,
                f => new { id = f.Entero("id"), nombre = f.Texto("nombre"), correo = f.Texto("correo"), rol = f.Texto("rol"),
                           activo = f.Booleano("activo"), ultimoIngreso = f.FechaHora("ultimo_ingreso"),
                           pendienteCambioClave = f.Booleano("debe_cambiar_clave"), esYo = f.Entero("id") == u.UsuarioId() })))
            .RequireAuthorization(Permisos.GestionarUsuarios);

        api.MapPost("/usuarios", async (UsuarioNuevoDto d, Db db, ClaimsPrincipal u) =>
        {
            var nombre = Recortar(d.Nombre, 80);
            var correo = Recortar(d.Correo, 120).ToLowerInvariant();
            if (nombre.Length < 2) return Error("Escribe el nombre de la persona.");
            if (!CorreoValido().IsMatch(correo)) return Error("El correo no es válido.");
            if (!Permisos.RolValido(d.Rol)) return Error("Elige el rol del usuario.");
            if (Claves.Validar(d.Clave) is { } problema) return Error(problema);
            if (await db.EscalarAsync<long>("SELECT COUNT(*) FROM usuarios WHERE correo = @c", ("c", correo)) > 0)
                return Error("Ya existe un usuario con ese correo.", 409);

            var id = await db.EscalarAsync<int>("""
                INSERT INTO usuarios (nombre, correo, clave_hash, rol, debe_cambiar_clave)
                VALUES (@n, @c, @h, @r, TRUE) RETURNING id
                """, ("n", nombre), ("c", correo), ("h", Claves.Cifrar(d.Clave!)), ("r", d.Rol));
            await db.Registrar(u, "usuario_creado", $"Creó a {nombre} ({correo}) con el rol {Permisos.NombreRol(d.Rol)}.");
            return Results.Ok(new { id });
        }).RequireAuthorization(Permisos.GestionarUsuarios);

        api.MapPut("/usuarios/{id:int}", async (int id, UsuarioEditarDto d, Db db, ClaimsPrincipal u) =>
        {
            var nombre = Recortar(d.Nombre, 80);
            if (nombre.Length < 2) return Error("Escribe el nombre de la persona.");
            if (!Permisos.RolValido(d.Rol)) return Error("Elige el rol del usuario.");

            var antes = (await db.ListaAsync("SELECT nombre, rol, activo FROM usuarios WHERE id = @i",
                f => new { nombre = f.Texto("nombre"), rol = f.Texto("rol"), activo = f.Booleano("activo") }, ("i", id))).FirstOrDefault();
            if (antes is null) return Error("El usuario no existe.", 404);
            var activo = d.Activo ?? antes.activo;

            if (id == u.UsuarioId() && (d.Rol != antes.rol || !activo))
                return Error("No puedes cambiar tu propio rol ni desactivarte. Pídeselo a otro administrador.");
            if (antes is { rol: "admin", activo: true } && (d.Rol != "admin" || !activo))
            {
                var otros = await db.EscalarAsync<long>("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin' AND activo AND id <> @i", ("i", id));
                if (otros == 0) return Error("Debe quedar al menos un administrador activo.", 409);
            }

            await db.EjecutarAsync("UPDATE usuarios SET nombre = @n, rol = @r, activo = @a WHERE id = @i",
                ("n", nombre), ("r", d.Rol), ("a", activo), ("i", id));
            var cambios = new List<string>();
            if (antes.nombre != nombre) cambios.Add($"nombre «{antes.nombre}» → «{nombre}»");
            if (antes.rol != d.Rol) cambios.Add($"rol {Permisos.NombreRol(antes.rol)} → {Permisos.NombreRol(d.Rol)}");
            if (antes.activo != activo) cambios.Add(activo ? "cuenta reactivada" : "cuenta desactivada");
            if (cambios.Count > 0)
                await db.Registrar(u, "usuario_editado", $"{antes.nombre}: {string.Join("; ", cambios)}.");
            return Results.Ok(new { ok = true });
        }).RequireAuthorization(Permisos.GestionarUsuarios);

        api.MapPost("/usuarios/{id:int}/clave", async (int id, ClaveDto d, Db db, ClaimsPrincipal u) =>
        {
            if (id == u.UsuarioId()) return Error("Tu propia contraseña se cambia desde «Mi cuenta».");
            if (Claves.Validar(d.Clave) is { } problema) return Error(problema);
            var nombre = (await db.ListaAsync("""
                UPDATE usuarios SET clave_hash = @h, debe_cambiar_clave = TRUE, intentos_fallidos = 0, bloqueado_hasta = NULL
                 WHERE id = @i RETURNING nombre
                """, f => f.Texto("nombre"), ("h", Claves.Cifrar(d.Clave!)), ("i", id))).FirstOrDefault();
            if (nombre is null) return Error("El usuario no existe.", 404);
            await db.Registrar(u, "clave_restablecida", $"Restableció la contraseña de {nombre}. Deberá cambiarla al entrar.");
            return Results.Ok(new { ok = true });
        }).RequireAuthorization(Permisos.GestionarUsuarios);

        // =========================== BITÁCORA (solo admin) ===========================
        api.MapGet("/auditoria", async (string? accion, int? limite, Db db) =>
        {
            var filtro = Recortar(accion, 40);
            var filas = await db.ListaAsync("""
                SELECT creado_en, usuario_nombre, rol, accion, detalle
                  FROM auditoria WHERE (@a = '' OR accion = @a)
                 ORDER BY creado_en DESC, id DESC LIMIT @l
                """,
                f => new { cuando = f.FechaHora("creado_en"), usuario = f.Texto("usuario_nombre"), rol = f.Texto("rol"),
                           accion = f.Texto("accion"), detalle = f.Texto("detalle") },
                ("a", filtro), ("l", Math.Clamp(limite ?? 100, 1, 500)));
            var acciones = await db.ListaAsync("SELECT DISTINCT accion FROM auditoria ORDER BY accion", f => f.Texto("accion"));
            return Results.Ok(new { filas, acciones });
        }).RequireAuthorization(Permisos.VerAuditoria);
    }
}
