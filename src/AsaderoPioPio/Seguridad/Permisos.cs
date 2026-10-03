using System.Security.Claims;

namespace AsaderoPioPio.Seguridad;

public record PermisoInfo(string Clave, string Nombre, string Descripcion);
public record RolInfo(string Clave, string Nombre, string Lema, string Descripcion);

/// <summary>
/// ÚNICO lugar donde se define qué puede hacer cada rol.
/// El servidor revisa estos permisos en cada petición: aunque alguien manipule la página
/// en el navegador, un cajero nunca podrá modificar el inventario.
/// Para dar o quitar un permiso a un rol, solo hay que editar el diccionario PorRol.
/// </summary>
public static class Permisos
{
    // ---- Claves de permisos (se usan en los endpoints y en el frontend) ----
    public const string VerInventario = "ver_inventario";
    public const string Vender = "vender";
    public const string VerVentasTodas = "ver_ventas_todas";
    public const string AnularVentas = "anular_ventas";
    public const string GestionarInventario = "gestionar_inventario";
    public const string VerCostos = "ver_costos";
    public const string VerReportes = "ver_reportes";
    public const string CerrarCaja = "cerrar_caja";
    public const string GestionarPrecios = "gestionar_precios";
    public const string GestionarGastos = "gestionar_gastos";
    public const string GestionarUsuarios = "gestionar_usuarios";
    public const string VerAuditoria = "ver_auditoria";

    public static readonly PermisoInfo[] Catalogo =
    [
        new(VerInventario, "Ver las existencias", "Consultar cuántos pollos hay y el historial de movimientos (sin ver costos)."),
        new(Vender, "Registrar ventas", "Armar el pedido, cobrar y registrar la venta."),
        new(VerVentasTodas, "Ver las ventas de todos", "Consultar las ventas de cualquier día y de cualquier vendedor."),
        new(AnularVentas, "Anular ventas", "Deshacer una venta registrada por error (los pollos vuelven al inventario)."),
        new(GestionarInventario, "Modificar el inventario", "Registrar compras, devoluciones, mermas y ajustes, y cambiar el stock mínimo."),
        new(VerCostos, "Ver costos y utilidad", "Ver lo que cuestan los pollos y cuánto gana el negocio."),
        new(VerReportes, "Ver reportes", "Consultar reportes de ventas, compras, gastos y utilidad."),
        new(CerrarCaja, "Hacer el cierre de caja", "Contar el efectivo al final del día y guardar el cierre."),
        new(GestionarPrecios, "Cambiar productos y precios", "Crear presentaciones, cambiar precios y ocultar productos."),
        new(GestionarGastos, "Registrar gastos", "Anotar los gastos del negocio (carbón, gas, servicios, nómina…)."),
        new(GestionarUsuarios, "Administrar el equipo", "Crear usuarios, asignar roles, desactivar cuentas y restablecer contraseñas."),
        new(VerAuditoria, "Ver la bitácora", "Revisar quién hizo cada cambio importante en el sistema."),
    ];

    public static readonly RolInfo[] Roles =
    [
        new("admin", "Administrador", "El dueño del sistema",
            "Controla todo: es el único que puede modificar el inventario, los precios y el equipo. También ve costos, utilidad y la bitácora."),
        new("supervisor", "Supervisor", "El encargado del turno",
            "Vigila el negocio sin tocar el inventario: vende, consulta todas las ventas y reportes, y hace el cierre de caja."),
        new("cajero", "Cajero", "Quien atiende al cliente",
            "Atiende el mostrador: registra ventas y consulta cuántos pollos quedan. No ve costos ni puede modificar nada del inventario."),
    ];

    private static readonly Dictionary<string, HashSet<string>> PorRol = new()
    {
        ["admin"] = [.. Catalogo.Select(p => p.Clave)],
        ["supervisor"] = [VerInventario, Vender, VerVentasTodas, VerCostos, VerReportes, CerrarCaja],
        ["cajero"] = [VerInventario, Vender],
    };

    public static bool RolValido(string? rol) => rol is not null && PorRol.ContainsKey(rol);

    public static string NombreRol(string? rol)
        => Roles.FirstOrDefault(r => r.Clave == rol)?.Nombre ?? "Sin rol";

    public static string[] De(string? rol)
        => rol is not null && PorRol.TryGetValue(rol, out var set) ? Catalogo.Select(p => p.Clave).Where(set.Contains).ToArray() : [];

    public static bool Tiene(string? rol, string permiso)
        => rol is not null && PorRol.TryGetValue(rol, out var set) && set.Contains(permiso);

    /// <summary>Roles que tienen un permiso (para armar las políticas de autorización).</summary>
    public static string[] RolesCon(string permiso)
        => PorRol.Where(r => r.Value.Contains(permiso)).Select(r => r.Key).ToArray();
}

/// <summary>Atajos para preguntarle al usuario de la sesión quién es y qué puede hacer.</summary>
public static class UsuarioActual
{
    public static int UsuarioId(this ClaimsPrincipal u)
        => int.TryParse(u.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    public static string Rol(this ClaimsPrincipal u) => u.FindFirstValue(ClaimTypes.Role) ?? "";

    public static bool Puede(this ClaimsPrincipal u, string permiso) => Permisos.Tiene(u.Rol(), permiso);
}
