using Microsoft.Data.Sqlite;

namespace Musiclify.Endpoints;

public static class TrackSearchEndpoints
{
    public static void MapTrackSearchEndpoints(this WebApplication app, string connectionString)
    {
        app.MapGet("/api/tracks/search/{query}", async (string query) =>
        {
            try
            {
                using var connection = new SqliteConnection(connectionString);
                await connection.OpenAsync();

                var command = connection.CreateCommand();
                command.CommandText = @"
                    SELECT 
                        t.TrackId, t.Title, t.TrackNumber, t.Duration, t.Path,
                        ar.ArtistId, ar.ArtistName,
                        al.AlbumId, al.Title, al.Year, al.Cover
                    FROM Tracks t
                    JOIN Artists ar ON t.ArtistId = ar.ArtistId
                    JOIN Albums al ON t.AlbumId = al.AlbumId
                    WHERE t.Title LIKE $query OR ar.ArtistName LIKE $query
                    ORDER BY t.Title
                    LIMIT 50";
                
                command.Parameters.AddWithValue("$query", $"%{query}%");

                var tracks = new List<dynamic>();
                using var reader = await command.ExecuteReaderAsync();
                
                while (await reader.ReadAsync())
                {
                     var trackId = reader.IsDBNull(0) ? 0 : reader.GetInt32(0);
                     var title = reader.IsDBNull(1) ? "Без назви" : reader.GetString(1);
                     var trackNumber = reader.IsDBNull(2) ? 0 : reader.GetInt32(2);
                     var duration = reader.IsDBNull(3) ? 0 : reader.GetInt32(3);
                     var path = reader.IsDBNull(4) ? "" : reader.GetString(4).Replace("\\", "/");
                     
                     var artistId = reader.IsDBNull(5) ? 0 : reader.GetInt32(5);
                     var artistName = reader.IsDBNull(6) ? "Невідомий виконавець" : reader.GetString(6);
                     
                     var albumId = reader.IsDBNull(7) ? 0 : reader.GetInt32(7);
                     var albumTitle = reader.IsDBNull(8) ? "Невідомий альбом" : reader.GetString(8);
                     var albumYear = reader.IsDBNull(9) ? 0 : reader.GetInt32(9);
                     var albumCover = reader.IsDBNull(10) ? "" : reader.GetString(10).Replace("\\", "/");

                     tracks.Add(new
                     {
                        TrackId = trackId,
                        Title = title,
                        TrackNumber = trackNumber,
                        Duration = duration,
                        Path = path,
                        Artist = new { ArtistId = artistId, ArtistName = artistName },
                        Album = new { 
                            AlbumId = albumId, 
                            Title = albumTitle, 
                            Year = albumYear, 
                            Cover = albumCover 
                        }
                     });
                }

                return Results.Ok(tracks);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Search Error: {ex.Message}");
                return Results.Problem($"Помилка пошуку: {ex.Message}");
            }
        })
        .WithName("SearchTracks");
    }
}