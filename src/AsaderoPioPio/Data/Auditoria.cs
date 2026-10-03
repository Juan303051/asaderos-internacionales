using System.Security.Claims;
using AsaderoPioPio.Seguridad;

namespace AsaderoPioPio.Data;

/// <summary>
/// Bitácora: deja escrito quién hizo cada cambio importante (compras, anulaciones, precios, usuarios…).
/// Solo se agrega información; ninguna pantalla permite editar ni borrar estos registros.
/// </summary>
public static class Auditoria
{
    private const string Sql = """
        INSERT INTO auditoria (usuario_id, usuario_nombre, rol, accion, detalle)
        VALUES (@i, @n, @r, @a, @d)
        """;

    private static (string, object?)[] Datos(int id, string nombre, string rol, string accion, string detalle)
        => [("i", id == 0 ? null : id), ("n", nombre), ("r", rol), ("a", accion), ("d", detalle)];

    public static Task Registrar(this Db db, ClaimsPrincipal u, string accion, string detalle)
        => db.EjecutarAsync(Sql, Datos(u.UsuarioId(), u.Identity?.Name ?? "", u.Rol(), accion, detalle));

    /// <summary>Versión para usar dentro de una transacción: si la operación falla, la bitácora también se deshace.</summary>
    public static Task Registrar(this Sesion s, ClaimsPrincipal u, string accion, string detalle)
        => s.EjecutarAsync(Sql, Datos(u.UsuarioId(), u.Identity?.Name ?? "", u.Rol(), accion, detalle));

    /// <summary>Para el ingreso, cuando todavía no existe una sesión.</summary>
    public static Task RegistrarComo(this Db db, int id, string nombre, string rol, string accion, string detalle)
        => db.EjecutarAsync(Sql, Datos(id, nombre, rol, accion, detalle));
}
