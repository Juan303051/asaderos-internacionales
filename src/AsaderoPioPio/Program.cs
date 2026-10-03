// =====================================================================
//  Asadero Pío Pío · Control de pollos — Servidor C# (ASP.NET Core 8, versión 4.0)
//  © 2026 Juan Diego González Marín y Santiago Cardoso Padilla
//
//  Este programa hace dos cosas:
//   1. Sirve el frontend (wwwroot: index.html, css, js, assets).
//   2. Expone la API /api/... que guarda todo en PostgreSQL.
//
//  Uso extra por consola (crear o cambiar la clave de un usuario):
//    dotnet run -- usuario --correo caja@piopio.com --clave "Clave123*" --nombre "Caja 1" --rol cajero
//  (roles: admin, supervisor, cajero)
// =====================================================================
using System.Diagnostics;
using System.Security.Claims;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Threading.RateLimiting;
using AsaderoPioPio.Data;
using AsaderoPioPio.Endpoints;
using AsaderoPioPio.Seguridad;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics;
using Npgsql;

var esComandoUsuario = args.Length > 0 && args[0] == "usuario";
// Versión publicada (.exe): wwwroot y appsettings.json están junto al ejecutable.
// Con "dotnet run": están en la carpeta del proyecto.
var raiz = Directory.Exists(Path.Combine(AppContext.BaseDirectory, "wwwroot"))
    ? AppContext.BaseDirectory : Directory.GetCurrentDirectory();
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = esComandoUsuario ? [] : args,
    ContentRootPath = raiz,
});

var cadena = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:Postgres en appsettings.json");

// ---------- Servicios ----------
builder.Services.AddSingleton(_ => NpgsqlDataSource.Create(cadena));
builder.Services.AddSingleton<Db>();

// Las llaves que cifran la cookie de sesión se guardan junto al programa,
// así las sesiones siguen vivas si se reinicia el computador.
builder.Services.AddDataProtection()
    .SetApplicationName("AsaderoPioPio")
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "llaves-sesion")));

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.Cookie.Name = "piopio.sesion";
        o.Cookie.HttpOnly = true;                              // JavaScript no puede leerla
        o.Cookie.SameSite = SameSiteMode.Strict;               // protege contra CSRF
        o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        o.ExpireTimeSpan = TimeSpan.FromHours(12);             // un turno de trabajo
        o.SlidingExpiration = true;
        // Es una API: en vez de redirigir a una página de login, responde 401/403.
        o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
        o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };

        // En CADA petición se confirma en la base que la cuenta siga activa y con el mismo rol.
        // Así, si el administrador desactiva a alguien o le cambia el rol, el cambio rige al instante
        // (no hay que esperar a que venza la sesión).
        o.Events.OnValidatePrincipal = async c =>
        {
            var db = c.HttpContext.RequestServices.GetRequiredService<Db>();
            var u = (await db.ListaAsync(
                "SELECT nombre, correo, rol, activo, debe_cambiar_clave FROM usuarios WHERE id = @i",
                f => new { Nombre = f.Texto("nombre"), Correo = f.Texto("correo"), Rol = f.Texto("rol"),
                           Activo = f.Booleano("activo"), Debe = f.Booleano("debe_cambiar_clave") },
                ("i", c.Principal?.UsuarioId() ?? 0))).FirstOrDefault();

            if (u is null || !u.Activo)
            {
                c.RejectPrincipal();
                await c.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                return;
            }
            var p = c.Principal!;
            if (p.Rol() != u.Rol || p.Identity?.Name != u.Nombre || (p.FindFirstValue("debe_cambiar") == "1") != u.Debe)
            {
                c.ReplacePrincipal(AuthEndpoints.CrearPrincipal(p.UsuarioId(), u.Nombre, u.Correo, u.Rol, u.Debe));
                c.ShouldRenew = true;
            }
        };
    });

// Una política por cada permiso (ver Seguridad/Permisos.cs): cada endpoint declara qué permiso exige.
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("admin", p => p.RequireRole("admin"));
builder.Services.AddAuthorization(o =>
{
    foreach (var permiso in Permisos.Catalogo)
        o.AddPolicy(permiso.Clave, p => p.RequireRole(Permisos.RolesCon(permiso.Clave)));
});

// Máximo 8 intentos de ingreso por minuto desde el mismo equipo (frena ataques de fuerza bruta).
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.OnRejected = async (ctx, ct) =>
        await ctx.HttpContext.Response.WriteAsJsonAsync(new { error = "Demasiados intentos. Espera un minuto." }, ct);
    o.AddPolicy("ingreso", http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "desconocido",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 8, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();
var log = app.Logger;

// ---------- Base de datos lista antes de atender ----------
try
{
    await InicioBaseDatos.CrearBaseSiNoExisteAsync(cadena, log);
    await InicioBaseDatos.PrepararAsync(app.Services.GetRequiredService<Db>(), app.Configuration, log);
}
catch (Exception ex) when (ex is NpgsqlException or SocketException or TimeoutException)
{
    log.LogCritical("No se pudo conectar a PostgreSQL: {Mensaje}", ex.Message);
    Console.WriteLine();
    Console.WriteLine("  ✖ No hay conexión con PostgreSQL.");
    Console.WriteLine("    Revise que PostgreSQL esté instalado y encendido, y que la contraseña");
    Console.WriteLine("    en appsettings.json (ConnectionStrings:Postgres) sea la correcta.");
    return 1;
}

// ---------- Comando de consola: crear / actualizar usuario ----------
if (esComandoUsuario)
{
    string? Arg(string n) { var i = Array.IndexOf(args, "--" + n); return i >= 0 && i + 1 < args.Length ? args[i + 1] : null; }
    var correo = Arg("correo"); var clave = Arg("clave");
    var rol = Arg("rol") ?? "cajero"; var nombre = Arg("nombre") ?? correo;
    if (correo is null || clave is null || Claves.Validar(clave) is not null || !Permisos.RolValido(rol))
    {
        Console.WriteLine("Uso: usuario --correo CORREO --clave CLAVE(8+ caracteres, con letras y números) [--nombre NOMBRE] [--rol admin|supervisor|cajero]");
        return 2;
    }
    await InicioBaseDatos.GuardarUsuarioAsync(app.Services.GetRequiredService<Db>(), nombre!, correo, clave, rol);
    Console.WriteLine($"✔ Usuario {correo.ToLowerInvariant()} guardado con rol {rol}.");
    return 0;
}

// ---------- Tubería HTTP ----------
app.UseExceptionHandler(e => e.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    log.LogError(ex, "Error no controlado");
    ctx.Response.StatusCode = ex is BadHttpRequestException ? 400 : 500;
    await ctx.Response.WriteAsJsonAsync(new
    {
        error = ex is BadHttpRequestException ? "Los datos enviados no son válidos." : "Ocurrió un error en el servidor. Intenta de nuevo."
    });
}));

// Cabeceras de seguridad básicas
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers.XContentTypeOptions = "nosniff";
    ctx.Response.Headers.XFrameOptions = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "same-origin";
    await next();
});

app.UseDefaultFiles();   // "/" -> index.html
// "no-cache" = el navegador siempre pregunta si el archivo cambió (rápido en la red local).
// Así, al actualizar el sistema, nadie se queda viendo la versión anterior de la página.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = c => c.Context.Response.Headers.CacheControl = "no-cache",
});
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Quien tiene una contraseña temporal (usuario nuevo o restablecida) solo puede cambiarla:
// el servidor rechaza todo lo demás hasta que lo haga.
app.Use(async (ctx, next) =>
{
    if (ctx.User.Identity?.IsAuthenticated == true && ctx.User.FindFirstValue("debe_cambiar") == "1"
        && ctx.Request.Path.StartsWithSegments("/api") && !ctx.Request.Path.StartsWithSegments("/api/auth")
        && !ctx.Request.Path.StartsWithSegments("/api/salud"))
    {
        ctx.Response.StatusCode = 403;
        await ctx.Response.WriteAsJsonAsync(new { error = "Antes de continuar debes cambiar tu contraseña.", codigo = "cambiar_clave" });
        return;
    }
    await next();
});

app.MapGet("/api/salud", async (Db db) =>
    Results.Ok(new { estado = "ok", baseDeDatos = await db.EscalarAsync<int>("SELECT 1") == 1, version = "4.0.0" }));
app.MapAuth();
app.MapInventario();
app.MapVentas();
app.MapNegocio();
app.MapAdministracion();
app.MapFallback("/api/{**resto}", () => Results.Json(new { error = "Ruta no encontrada." }, statusCode: 404));

// ---------- Mensaje de bienvenida y apertura del navegador ----------
app.Lifetime.ApplicationStarted.Register(() =>
{
    var puerto = app.Urls.Select(u => new Uri(u.Replace("0.0.0.0", "localhost").Replace("[::]", "localhost").Replace("*", "localhost")).Port).FirstOrDefault(5080);
    Console.WriteLine();
    Console.WriteLine("  ASADERO PÍO PÍO · Control de pollos  (v4.0)");
    Console.WriteLine($"  En este computador:  http://localhost:{puerto}");
    foreach (var ip in IpsLocales())
        Console.WriteLine($"  Desde otro equipo del local (misma red WiFi):  http://{ip}:{puerto}");
    Console.WriteLine("  Para apagar el sistema cierre esta ventana (o Ctrl + C).");
    Console.WriteLine();

    if (app.Configuration.GetValue("AbrirNavegador", false))
    {
        try { Process.Start(new ProcessStartInfo($"http://localhost:{puerto}") { UseShellExecute = true }); }
        catch { /* sin navegador (servidor o Docker): no pasa nada */ }
    }
});

try
{
    await app.RunAsync();
}
catch (IOException ex) when (ex.InnerException is SocketException || ex.Message.Contains("address already in use", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("  ✖ El puerto ya está ocupado: probablemente el sistema del asadero ya está abierto.");
    Console.WriteLine("    Abra http://localhost:5080 en el navegador o cierre la otra ventana y vuelva a intentar.");
    return 3;
}
return 0;

static IEnumerable<string> IpsLocales()
{
    try
    {
        return NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses)
            .Where(a => a.Address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(a.Address))
            .Select(a => a.Address.ToString())
            .Distinct().ToList();
    }
    catch { return []; }
}
