using Microsoft.Data.Sqlite;
using Musiclify.Models;

namespace Musiclify.Endpoints;

public static class AlbumSearchEndpoints
{
    public static void Map(WebApplication app, string connectionString)
    {
        app.MapGet("/api/albums/search/{query}", async (string query) =>
        {
            using var connection = new SqliteConnection(connectionString);
            await connection.OpenAsync();

            var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT 
                    al.AlbumId,
                    al.Title,
                    al.Year,
                    al.Cover,
                    al.TracksNumber,
                    ar.ArtistId,
                    ar.ArtistName
                FROM Albums al
                JOIN Artists ar ON al.ArtistId = ar.ArtistId
                WHERE al.Title LIKE $query OR ar.ArtistName LIKE $query
                ORDER BY al.Year DESC
                LIMIT 20
            ";
            command.Parameters.AddWithValue("$query", $"%{query}%");

            using var reader = await command.ExecuteReaderAsync();
            var albums = new List<AlbumWithArtist>();

            while (await reader.ReadAsync())
            {
                albums.Add(new AlbumWithArtist
                {
                    AlbumId = reader.GetInt32(0),
                    Title = reader.GetString(1),
                    Year = reader.GetInt32(2),
                    Cover = reader.GetString(3),
                    TracksNumber = reader.GetInt32(4),
                    ArtistId = reader.GetInt32(5),
                    ArtistName = reader.GetString(6)
                });
            }

            return Results.Ok(albums);
        });
    }
}