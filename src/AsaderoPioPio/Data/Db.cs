using System.Globalization;
using Npgsql;

namespace AsaderoPioPio.Data;

/// <summary>
/// Acceso a PostgreSQL. Todas las consultas usan parámetros (@nombre),
/// nunca se pega texto del usuario dentro del SQL: así se evita la inyección SQL.
/// </summary>
public sealed class Db(NpgsqlDataSource fuente)
{
    /// <summary>Abre una conexión sin transacción (para lecturas y escrituras simples).</summary>
    public async Task<Sesion> AbrirAsync()
        => new Sesion(await fuente.OpenConnectionAsync(), null);

    /// <summary>
    /// Ejecuta un bloque dentro de una transacción: si algo falla, se deshace todo
    /// (por ejemplo, no puede quedar una venta sin su detalle).
    /// </summary>
    public async Task<T> EnTransaccionAsync<T>(Func<Sesion, Task<T>> trabajo)
    {
        var conexion = await fuente.OpenConnectionAsync();
        var transaccion = await conexion.BeginTransactionAsync();
        await using var sesion = new Sesion(conexion, transaccion);
        try
        {
            var resultado = await trabajo(sesion);
            await transaccion.CommitAsync();
            return resultado;
        }
        catch
        {
            await transaccion.RollbackAsync();
            throw;
        }
    }

    // Atajos de una sola consulta
    public async Task<List<T>> ListaAsync<T>(string sql, Func<Fila, T> mapear, params (string, object?)[] p)
    { await using var s = await AbrirAsync(); return await s.ListaAsync(sql, mapear, p); }

    public async Task<T?> EscalarAsync<T>(string sql, params (string, object?)[] p)
    { await using var s = await AbrirAsync(); return await s.EscalarAsync<T>(sql, p); }

    public async Task<int> EjecutarAsync(string sql, params (string, object?)[] p)
    { await using var s = await AbrirAsync(); return await s.EjecutarAsync(sql, p); }
}

/// <summary>Una conexión abierta (y, si aplica, su transacción).</summary>
public sealed class Sesion(NpgsqlConnection conexion, NpgsqlTransaction? transaccion) : IAsyncDisposable
{
    private NpgsqlCommand Comando(string sql, (string Nombre, object? Valor)[] parametros)
    {
        var cmd = new NpgsqlCommand(sql, conexion, transaccion);
        foreach (var (nombre, valor) in parametros)
            cmd.Parameters.AddWithValue(nombre, valor ?? DBNull.Value);
        return cmd;
    }

    /// <summary>INSERT / UPDATE / DELETE. Devuelve cuántas filas cambiaron.</summary>
    public async Task<int> EjecutarAsync(string sql, params (string, object?)[] p)
    {
        await using var cmd = Comando(sql, p);
        return await cmd.ExecuteNonQueryAsync();
    }

    /// <summary>Consulta que devuelve un solo valor (primera columna de la primera fila).</summary>
    public async Task<T?> EscalarAsync<T>(string sql, params (string, object?)[] p)
    {
        await using var cmd = Comando(sql, p);
        var valor = await cmd.ExecuteScalarAsync();
        if (valor is null or DBNull) return default;
        var tipo = Nullable.GetUnderlyingType(typeof(T)) ?? typeof(T);
        return (T)Convert.ChangeType(valor, tipo, CultureInfo.InvariantCulture);
    }

    /// <summary>Consulta de varias filas; cada fila se convierte con la función <paramref name="mapear"/>.</summary>
    public async Task<List<T>> ListaAsync<T>(string sql, Func<Fila, T> mapear, params (string, object?)[] p)
    {
        await using var cmd = Comando(sql, p);
        await using var lector = await cmd.ExecuteReaderAsync();
        var fila = new Fila(lector);
        var lista = new List<T>();
        while (await lector.ReadAsync()) lista.Add(mapear(fila));
        return lista;
    }

    public async ValueTask DisposeAsync()
    {
        if (transaccion is not null) await transaccion.DisposeAsync();
        await conexion.DisposeAsync();
    }
}

/// <summary>Lectura cómoda de columnas por nombre.</summary>
public sealed class Fila(NpgsqlDataReader lector)
{
    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    private object? Valor(string columna)
    {
        var i = lector.GetOrdinal(columna);
        return lector.IsDBNull(i) ? null : lector.GetValue(i);
    }

    public int Entero(string c) => Convert.ToInt32(Valor(c) ?? 0, Inv);
    public decimal Decimal(string c) => Convert.ToDecimal(Valor(c) ?? 0m, Inv);
    public string Texto(string c) => Convert.ToString(Valor(c), Inv) ?? "";
    public bool Booleano(string c) => Convert.ToBoolean(Valor(c) ?? false, Inv);

    /// <summary>Momento guardado en la base (timestamptz) convertido a la hora del computador, o null si está vacío.</summary>
    private DateTime? Momento(string c)
    {
        var i = lector.GetOrdinal(c);
        return lector.IsDBNull(i) ? null : lector.GetFieldValue<DateTime>(i).ToLocalTime();
    }

    public string Hora(string c) => Momento(c)?.ToString("HH:mm", Inv) ?? "";
    public string FechaHora(string c) => Momento(c)?.ToString("yyyy-MM-dd HH:mm", Inv) ?? "";
}
