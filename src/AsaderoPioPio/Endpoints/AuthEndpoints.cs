using System.Security.Claims;
using AsaderoPioPio.Data;
using AsaderoPioPio.Seguridad;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using static AsaderoPioPio.Endpoints.Ayudas;

namespace AsaderoPioPio.Endpoints;

public record EntrarDto(string? Correo, string? Clave);
public record CambiarClaveDto(string? Actual, string? Nueva);

/// <summary>Ingreso, salida, "¿quién soy y qué puedo hacer?" y cambio de contraseña. La sesión viaja en una cookie cifrada HttpOnly.</summary>
public static class AuthEndpoints
{
    private const int IntentosMaximos = 5;
    private const int MinutosDeBloqueo = 5;

    /// <summary>Arma la identidad de la sesión (los datos que viajan en la cookie).</summary>
    public static ClaimsPrincipal CrearPrincipal(int id, string nombre, string correo, string rol, bool debeCambiarClave)
        => new(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, id.ToString()),
            new Claim(ClaimTypes.Name, nombre),
            new Claim(ClaimTypes.Email, correo),
            new Claim(ClaimTypes.Role, rol),
            new Claim("debe_cambiar", debeCambiarClave ? "1" : "0"),
        ], CookieAuthenticationDefaults.AuthenticationScheme));

    /// <summary>Lo que el navegador necesita saber del usuario: quién es, su rol y sus permisos.</summary>
    public static object Perfil(ClaimsPrincipal u) => new
    {
        id = u.UsuarioId(),
        nombre = u.Identity?.Name,
        correo = u.FindFirstValue(ClaimTypes.Email),
        rol = u.Rol(),
        rolNombre = Permisos.NombreRol(u.Rol()),
        rolLema = Permisos.Roles.FirstOrDefault(r => r.Clave == u.Rol())?.Lema ?? "",
        rolDescripcion = Permisos.Roles.FirstOrDefault(r => r.Clave == u.Rol())?.Descripcion ?? "",
        permisos = Permisos.De(u.Rol()),
        debeCambiarClave = u.FindFirstValue("debe_cambiar") == "1",
    };

    public static void MapAuth(this WebApplication app)
    {
        var g = app.MapGroup("/api/auth");

        g.MapPost("/entrar", async (EntrarDto datos, Db db, HttpContext http) =>
        {
            if (string.IsNullOrWhiteSpace(datos.Correo) || string.IsNullOrEmpty(datos.Clave))
                return Error("Escribe el correo y la contraseña.");

            var usuario = (await db.ListaAsync("""
                SELECT id, nombre, correo, clave_hash, rol, debe_cambiar_clave,
                       (bloqueado_hasta IS NOT NULL AND bloqueado_hasta > NOW()) AS bloqueado
                  FROM usuarios WHERE correo = LOWER(@c) AND activo
                """,
                f => new { Id = f.Entero("id"), Nombre = f.Texto("nombre"), Correo = f.Texto("correo"),
                           Huella = f.Texto("clave_hash"), Rol = f.Texto("rol"),
                           Debe = f.Booleano("debe_cambiar_clave"), Bloqueado = f.Booleano("bloqueado") },
                ("c", datos.Correo.Trim()))).FirstOrDefault();

            // Siempre se verifica una huella (real o falsa) para no revelar si el correo existe.
            var valida = Claves.Verificar(datos.Clave, usuario?.Huella ?? Claves.HuellaFalsa);

            if (usuario is null || !valida)
            {
                if (usuario is { Bloqueado: false })
                {
                    // Cada fallo suma; al llegar al máximo la cuenta se bloquea unos minutos.
                    var bloqueada = (await db.ListaAsync($"""
                        UPDATE usuarios
                           SET intentos_fallidos = CASE WHEN intentos_fallidos + 1 >= {IntentosMaximos} THEN 0 ELSE intentos_fallidos + 1 END,
                               bloqueado_hasta   = CASE WHEN intentos_fallidos + 1 >= {IntentosMaximos} THEN NOW() + INTERVAL '{MinutosDeBloqueo} minutes' ELSE bloqueado_hasta END
                         WHERE id = @i
                        RETURNING (bloqueado_hasta IS NOT NULL AND bloqueado_hasta > NOW()) AS bloqueada
                        """, f => f.Booleano("bloqueada"), ("i", usuario.Id))).FirstOrDefault();
                    if (bloqueada)
                    {
                        await db.RegistrarComo(usuario.Id, usuario.Nombre, usuario.Rol, "bloqueo",
                            $"Cuenta bloqueada {MinutosDeBloqueo} minutos por {IntentosMaximos} intentos fallidos.");
                        return Error($"Demasiados intentos fallidos. Por seguridad, la cuenta se bloqueó {MinutosDeBloqueo} minutos.", 423);
                    }
                }
                return Error("Correo o contraseña incorrectos.", 401);
            }

            if (usuario.Bloqueado)
                return Error($"Esta cuenta está bloqueada unos minutos por intentos fallidos. Intenta más tarde.", 423);

            await db.EjecutarAsync(
                "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_ingreso = NOW() WHERE id = @i",
                ("i", usuario.Id));
            await db.RegistrarComo(usuario.Id, usuario.Nombre, usuario.Rol, "ingreso", "Inició sesión.");

            var principal = CrearPrincipal(usuario.Id, usuario.Nombre, usuario.Correo, usuario.Rol, usuario.Debe);
            await http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
            return Results.Ok(Perfil(principal));
        }).RequireRateLimiting("ingreso");

        g.MapPost("/salir", async (HttpContext http) =>
        {
            await http.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok(new { ok = true });
        });

        g.MapGet("/yo", (ClaimsPrincipal u) => Results.Ok(Perfil(u))).RequireAuthorization();

        g.MapPost("/cambiar-clave", async (CambiarClaveDto d, Db db, ClaimsPrincipal u) =>
        {
            var huella = await db.EscalarAsync<string>("SELECT clave_hash FROM usuarios WHERE id = @i AND activo", ("i", u.UsuarioId()));
            if (huella is null || !Claves.Verificar(d.Actual ?? "", huella))
                return Error("La contraseña actual no es correcta.");
            if (d.Actual == d.Nueva) return Error("La contraseña nueva debe ser distinta de la actual.");
            if (Claves.Validar(d.Nueva) is { } problema) return Error(problema);

            await db.EjecutarAsync(
                "UPDATE usuarios SET clave_hash = @h, debe_cambiar_clave = FALSE WHERE id = @i",
                ("h", Claves.Cifrar(d.Nueva!)), ("i", u.UsuarioId()));
            await db.Registrar(u, "clave_cambiada", "Cambió su propia contraseña.");
            return Results.Ok(new { ok = true });
        }).RequireAuthorization().RequireRateLimiting("ingreso");

        // Catálogo de roles y permisos: la pantalla de Ayuda y la de Equipo lo usan para explicar quién puede qué.
        g.MapGet("/roles", () => Results.Ok(new
        {
            roles = Permisos.Roles.Select(r => new { r.Clave, r.Nombre, r.Lema, r.Descripcion, permisos = Permisos.De(r.Clave) }),
            permisos = Permisos.Catalogo,
        })).RequireAuthorization();
    }
}
