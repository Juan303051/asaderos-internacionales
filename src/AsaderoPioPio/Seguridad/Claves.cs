using System.Security.Cryptography;

namespace AsaderoPioPio.Seguridad;

/// <summary>
/// Cifrado de contraseñas con PBKDF2-SHA256 (incluido en .NET, recomendado por OWASP).
/// Se guarda: algoritmo$iteraciones$sal$huella. La contraseña original no se puede recuperar.
/// </summary>
public static class Claves
{
    private const int Iteraciones = 210_000;
    private const int TamSal = 16;
    private const int TamHuella = 32;

    // Huella falsa para comparar cuando el correo no existe: así la respuesta
    // tarda lo mismo y no revela qué correos están registrados.
    public static readonly string HuellaFalsa = Cifrar(Guid.NewGuid().ToString());

    /// <summary>Reglas para una contraseña nueva. Devuelve el mensaje de error, o null si es válida.</summary>
    public static string? Validar(string? clave)
    {
        if (string.IsNullOrEmpty(clave) || clave.Length < 8) return "La contraseña debe tener al menos 8 caracteres.";
        if (clave.Length > 100) return "La contraseña no puede superar 100 caracteres.";
        if (!clave.Any(char.IsLetter) || !clave.Any(char.IsDigit)) return "La contraseña debe tener letras y números.";
        return null;
    }

    public static string Cifrar(string clave)
    {
        var sal = RandomNumberGenerator.GetBytes(TamSal);
        var huella = Rfc2898DeriveBytes.Pbkdf2(clave, sal, Iteraciones, HashAlgorithmName.SHA256, TamHuella);
        return $"pbkdf2${Iteraciones}${Convert.ToBase64String(sal)}${Convert.ToBase64String(huella)}";
    }

    public static bool Verificar(string clave, string guardado)
    {
        var partes = guardado.Split('$');
        if (partes.Length != 4 || partes[0] != "pbkdf2" || !int.TryParse(partes[1], out var iter)) return false;
        try
        {
            var sal = Convert.FromBase64String(partes[2]);
            var esperada = Convert.FromBase64String(partes[3]);
            var calculada = Rfc2898DeriveBytes.Pbkdf2(clave, sal, iter, HashAlgorithmName.SHA256, esperada.Length);
            return CryptographicOperations.FixedTimeEquals(calculada, esperada);
        }
        catch (FormatException) { return false; }
    }
}
