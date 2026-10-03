using System.Reflection;
using System.Text.RegularExpressions;
using AsaderoPioPio.Seguridad;
using Npgsql;

namespace AsaderoPioPio.Data;

/// <summary>
/// Deja la base de datos lista al arrancar:
///  1. Crea la base "asadero_pio_pio" si no existe.
///  2. Ejecuta el esquema (tablas y vistas) y los datos iniciales.
///  3. Crea el usuario administrador la primera vez (y le pide cambiar la clave al entrar).
/// Así el asadero solo tiene que instalar PostgreSQL y abrir el programa.
/// </summary>
public static partial class InicioBaseDatos
{
    [GeneratedRegex("^[A-Za-z0-9_]+$")]
    private static partial Regex NombreSeguro();

    public static async Task CrearBaseSiNoExisteAsync(string cadena, ILogger log)
    {
        try
        {
            await using var prueba = new NpgsqlConnection(cadena);
            await prueba.OpenAsync();
        }
        catch (PostgresException ex) when (ex.SqlState == "3D000") // 3D000 = la base no existe
        {
            var datos = new NpgsqlConnectionStringBuilder(cadena);
            var nombre = datos.Database ?? "asadero_pio_pio";
            if (!NombreSeguro().IsMatch(nombre))
                throw new InvalidOperationException($"Nombre de base de datos no válido: {nombre}");

            datos.Database = "postgres";
            await using var conexion = new NpgsqlConnection(datos.ConnectionString);
            await conexion.OpenAsync();
            await using var cmd = new NpgsqlCommand($"CREATE DATABASE \"{nombre}\" ENCODING 'UTF8'", conexion);
            await cmd.ExecuteNonQueryAsync();
            log.LogInformation("Base de datos {Nombre} creada.", nombre);
        }
    }

    public static async Task PrepararAsync(Db db, IConfiguration config, ILogger log)
    {
        await db.EjecutarAsync(LeerScript("01_esquema.sql"));
        await db.EjecutarAsync(LeerScript("02_datos_iniciales.sql"));

        var usuarios = await db.EscalarAsync<long>("SELECT COUNT(*) FROM usuarios");
        if (usuarios == 0)
        {
            var nombre = config["AdminInicial:Nombre"] ?? "Administrador";
            var correo = config["AdminInicial:Correo"] ?? "admin@piopio.com";
            var clave = config["AdminInicial:Clave"] ?? "PioPio2026*";
            await GuardarUsuarioAsync(db, nombre, correo, clave, "admin", debeCambiarClave: true);
            log.LogWarning("Se creó el administrador {Correo}. Al entrar, el sistema le pedirá cambiar la contraseña inicial.", correo);
        }
    }

    /// <summary>Crea el usuario o, si el correo ya existe, actualiza su nombre, clave y rol.</summary>
    public static Task<int> GuardarUsuarioAsync(Db db, string nombre, string correo, string clave, string rol, bool debeCambiarClave = false)
        => db.EjecutarAsync("""
            INSERT INTO usuarios (nombre, correo, clave_hash, rol, debe_cambiar_clave)
            VALUES (@n, LOWER(@c), @h, @r, @d)
            ON CONFLICT (correo) DO UPDATE
               SET nombre = EXCLUDED.nombre, clave_hash = EXCLUDED.clave_hash,
                   rol = EXCLUDED.rol, activo = TRUE, debe_cambiar_clave = EXCLUDED.debe_cambiar_clave,
                   intentos_fallidos = 0, bloqueado_hasta = NULL
            """,
            ("n", nombre.Trim()), ("c", correo.Trim()), ("h", Claves.Cifrar(clave)), ("r", rol), ("d", debeCambiarClave));

    private static string LeerScript(string nombre)
    {
        using var flujo = Assembly.GetExecutingAssembly().GetManifestResourceStream(nombre)
            ?? throw new InvalidOperationException($"No se encontró el script {nombre}");
        using var lector = new StreamReader(flujo);
        return lector.ReadToEnd();
    }
}
