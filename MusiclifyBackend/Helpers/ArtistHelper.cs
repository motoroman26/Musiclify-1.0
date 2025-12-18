using Microsoft.Data.Sqlite;

namespace Musiclify.Endpoints.Helpers;

public static class ArtistHelper
{
    public static async Task<int> GetOrCreateArtist(SqliteConnection connection, string artistName)
    {
        var findCommand = connection.CreateCommand();
        findCommand.CommandText = "SELECT ArtistId FROM Artists WHERE ArtistName = $artistName";
        findCommand.Parameters.AddWithValue("$artistName", artistName.Trim());

        var result = await findCommand.ExecuteScalarAsync();
        if (result != null) return Convert.ToInt32(result);

        var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = "INSERT INTO Artists (ArtistName) VALUES ($artistName); SELECT last_insert_rowid();";
        insertCommand.Parameters.AddWithValue("$artistName", artistName.Trim());

        return Convert.ToInt32(await insertCommand.ExecuteScalarAsync());
    }
}