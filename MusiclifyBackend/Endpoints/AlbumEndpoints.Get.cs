using Microsoft.Data.Sqlite;
using Musiclify.Models;

namespace Musiclify.Endpoints;

public static class AlbumGetEndpoints
{
    public static void Map(WebApplication app, string connectionString)
    {
        app.MapGet("/api/albums", async () =>
        {
            try
            {
                var dbPath = connectionString.Replace("Data Source=", "").Replace(";", "");
                if (!File.Exists(dbPath))
                {
                    return Results.Problem("Database file not found", statusCode: 500);
                }

                using var connection = new SqliteConnection(connectionString);
                await connection.OpenAsync();

                var checkCommand = connection.CreateCommand();
                checkCommand.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name='Albums'";
                var tableExists = await checkCommand.ExecuteScalarAsync();
                
                if (tableExists == null)
                {
                    return Results.Ok(new { count = 0, albums = new List<AlbumWithArtist>() });
                }

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
                    LEFT JOIN Artists ar ON al.ArtistId = ar.ArtistId
                    ORDER BY al.Year DESC
                ";

                using var reader = await command.ExecuteReaderAsync();
                
                var albums = new List<AlbumWithArtist>();

                while (await reader.ReadAsync())
                {
                    albums.Add(new AlbumWithArtist
                    {
                        AlbumId = reader.GetInt32(0),
                        Title = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                        Year = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                        Cover = reader.IsDBNull(3) ? null : reader.GetString(3),
                        TracksNumber = reader.IsDBNull(4) ? 0 : reader.GetInt32(4),
                        ArtistId = reader.IsDBNull(5) ? 0 : reader.GetInt32(5),
                        ArtistName = reader.IsDBNull(6) ? "Unknown Artist" : reader.GetString(6)
                    });
                }

                return Results.Ok(new
                {
                    count = albums.Count,
                    albums = albums
                });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message, statusCode: 500);
            }
        })
        .WithName("GetAllAlbums");

        app.MapGet("/api/albums/{id:int}", async (int id) =>
        {
            try
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
                    LEFT JOIN Artists ar ON al.ArtistId = ar.ArtistId
                    WHERE al.AlbumId = $id
                ";
                
                command.Parameters.AddWithValue("$id", id);

                using var reader = await command.ExecuteReaderAsync();
                
                if (!await reader.ReadAsync())
                {
                    return Results.NotFound(new { message = "Album not found" });
                }

                var album = new AlbumWithArtist
                {
                    AlbumId = reader.GetInt32(0),
                    Title = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                    Year = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                    Cover = reader.IsDBNull(3) ? null : reader.GetString(3),
                    TracksNumber = reader.IsDBNull(4) ? 0 : reader.GetInt32(4),
                    ArtistId = reader.IsDBNull(5) ? 0 : reader.GetInt32(5),
                    ArtistName = reader.IsDBNull(6) ? "Unknown Artist" : reader.GetString(6)
                };

                return Results.Ok(album);
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message, statusCode: 500);
            }
        })
        .WithName("GetAlbumById");
    }
}