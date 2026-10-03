using System.Globalization;

namespace AsaderoPioPio.Endpoints;

/// <summary>Funciones pequeñas que usan todos los endpoints.</summary>
public static class Ayudas
{
    /// <summary>Candado compartido: evita que dos cajas modifiquen el inventario al mismo tiempo.</summary>
    public const long CandadoInventario = 72017201;

    private static readonly CultureInfo Co = new("es-CO");

    /// <summary>Fecha de hoy según el reloj del computador del asadero (hora de Colombia).</summary>
    public static DateOnly Hoy() => DateOnly.FromDateTime(DateTime.Now);

    public static IResult Error(string mensaje, int codigo = 400) => Results.Json(new { error = mensaje }, statusCode: codigo);

    public static string Num(decimal n) => n.ToString("0.##", Co);

    public static string Dinero(decimal n) => "$ " + Math.Round(n).ToString("N0", Co);

    /// <summary>Quita espacios y corta el texto al máximo permitido.</summary>
    public static string Recortar(string? texto, int max)
    {
        var t = (texto ?? "").Trim();
        return t.Length > max ? t[..max] : t;
    }

    /// <summary>Los pollos se venden en cuartos: 0.25, 0.5, 1, 1.5…</summary>
    public static bool EsMultiploDeCuarto(decimal n) => n % 0.25m == 0;

    public static bool TryFecha(string? texto, out DateOnly fecha)
        => DateOnly.TryParseExact(texto, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out fecha);
}
