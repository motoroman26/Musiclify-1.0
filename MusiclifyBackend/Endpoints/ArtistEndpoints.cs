using Microsoft.Data.Sqlite;
using Musiclify.Models;

namespace Musiclify.Endpoints;

public static class ArtistEndpoints
{
    public static void MapArtistEndpoints(this WebApplication app, string connectionString)
    {
        app.MapGet("/api/artists", async () =>
        {
            try
            {
                using var connection = new SqliteConnection(connectionString);
                await connection.OpenAsync();

                var command = connection.CreateCommand();
                command.CommandText = @"
                    SELECT 
                        ar.ArtistId, 
                        ar.ArtistName,
                        COUNT(al.AlbumId) as AlbumCount
                    FROM Artists ar
                    LEFT JOIN Albums al ON ar.ArtistId = al.ArtistId
                    GROUP BY ar.ArtistId, ar.ArtistName
                    ORDER BY ar.ArtistName";

                var artists = new List<dynamic>();
                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    artists.Add(new
                    {
                        ArtistId = reader.GetInt32(0),
                        ArtistName = reader.GetString(1),
                        AlbumCount = reader.GetInt32(2)
                    });
                }

                return Results.Ok(artists);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting artists: {ex.Message}");
                return Results.Problem(ex.Message);
            }
        })
        .WithName("GetAllArtists");
    }
}