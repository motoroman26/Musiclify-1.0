using Microsoft.Data.Sqlite;

namespace Musiclify.Endpoints;

public static class TrackEndpoints
{
    public static void MapTrackEndpoints(this WebApplication app, string connectionString)
    {
        app.MapGet("/api/tracks", async () =>
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
                    ORDER BY t.AlbumId, t.TrackNumber";

                using var reader = await command.ExecuteReaderAsync();
                var tracks = new List<object>();

                while (await reader.ReadAsync())
                {
                    tracks.Add(MapTrack(reader, true));
                }

                return Results.Ok(tracks);
            }
            catch
            {
                return Results.Problem("Error retrieving tracks");
            }
        })
        .WithName("GetAllTracks")
        .WithOpenApi();

        app.MapGet("/api/tracks/{id:int}", async (int id) =>
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
                    WHERE t.TrackId = $id";
                
                command.Parameters.AddWithValue("$id", id);

                using var reader = await command.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                    return Results.NotFound(new { message = "Track not found" });

                return Results.Ok(MapTrack(reader, true));
            }
            catch
            {
                return Results.Problem("Error retrieving track");
            }
        })
        .WithName("GetTrackById")
        .WithOpenApi();

        app.MapGet("/api/albums/{albumId:int}/tracks", async (int albumId) =>
        {
            try
            {
                using var connection = new SqliteConnection(connectionString);
                await connection.OpenAsync();

                var command = connection.CreateCommand();
                command.CommandText = @"
                    SELECT 
                        t.TrackId, t.Title, t.TrackNumber, t.Duration, t.Path,
                        ar.ArtistId, ar.ArtistName
                    FROM Tracks t
                    JOIN Artists ar ON t.ArtistId = ar.ArtistId
                    WHERE t.AlbumId = $albumId
                    ORDER BY t.TrackNumber";
                
                command.Parameters.AddWithValue("$albumId", albumId);

                using var reader = await command.ExecuteReaderAsync();
                var tracks = new List<object>();

                while (await reader.ReadAsync())
                {
                    tracks.Add(MapTrack(reader, false));
                }

                return Results.Ok(tracks);
            }
            catch
            {
                return Results.Problem("Error retrieving album tracks");
            }
        })
        .WithName("GetAlbumTracks")
        .WithOpenApi();
    }

    private static object MapTrack(SqliteDataReader reader, bool includeAlbum)
    {
        var trackId = reader.IsDBNull(0) ? 0 : reader.GetInt32(0);
        var title = reader.IsDBNull(1) ? "Unknown Title" : reader.GetString(1);
        var trackNumber = reader.IsDBNull(2) ? 0 : reader.GetInt32(2);
        var duration = reader.IsDBNull(3) ? 0 : reader.GetInt32(3);
        var path = reader.IsDBNull(4) ? "" : reader.GetString(4).Replace("\\", "/");
        var artistId = reader.IsDBNull(5) ? 0 : reader.GetInt32(5);
        var artistName = reader.IsDBNull(6) ? "Unknown Artist" : reader.GetString(6);

        var track = new
        {
            TrackId = trackId,
            Title = title,
            TrackNumber = trackNumber,
            Duration = duration,
            Path = path,
            Artist = new
            {
                ArtistId = artistId,
                ArtistName = artistName
            }
        };

        if (includeAlbum)
        {
            return new
            {
                track.TrackId, track.Title, track.TrackNumber, track.Duration, track.Path, track.Artist,
                Album = new
                {
                    AlbumId = reader.IsDBNull(7) ? 0 : reader.GetInt32(7),
                    Title = reader.IsDBNull(8) ? "Unknown Album" : reader.GetString(8),
                    Year = reader.IsDBNull(9) ? 0 : reader.GetInt32(9),
                    Cover = reader.IsDBNull(10) ? "" : reader.GetString(10).Replace("\\", "/")
                }
            };
        }

        return track;
    }
}