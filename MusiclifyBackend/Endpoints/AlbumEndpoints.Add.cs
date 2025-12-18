using Microsoft.Data.Sqlite;
using Musiclify.Endpoints.Helpers;
using Musiclify.Services;
using System.Text.RegularExpressions;

namespace Musiclify.Endpoints;

public static class AlbumAddEndpoints
{
    public static void Map(WebApplication app, string connectionString, string coversRoot)
    {
        app.MapPost("/api/albums", async (HttpContext context) =>
        {
            using var connection = new SqliteConnection(connectionString);
            await connection.OpenAsync();

            var form = await context.Request.ReadFormAsync();
            var title = form["title"].FirstOrDefault()?.Trim() ?? string.Empty;
            var artistName = form["artistName"].FirstOrDefault()?.Trim() ?? string.Empty;
            var yearStr = form["year"].FirstOrDefault() ?? string.Empty;

            if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(artistName) || string.IsNullOrEmpty(yearStr))
                return Results.BadRequest(new { message = "Всі поля обов'язкові" });

            if (!int.TryParse(yearStr, out int year))
                return Results.BadRequest(new { message = "Невірний формат року" });

            var artistId = await ArtistHelper.GetOrCreateArtist(connection, artistName);

            var coverPath = await ProcessCover(form.Files["cover"], artistName, title, coversRoot);
            
            using var transaction = await connection.BeginTransactionAsync();

            var albumId = await InsertAlbum(connection, artistId, title, year, coverPath);
            
            var musicRoot = Path.Combine(Directory.GetParent(coversRoot)?.FullName ?? Directory.GetCurrentDirectory(), "music");
            
            var trackFiles = form.Files.GetFiles("tracks");
            var successfulTracks = await ProcessTracks(connection, albumId, artistId, artistName, title, trackFiles, musicRoot);
            
            await UpdateAlbumTrackCount(connection, albumId, successfulTracks);
            
            await transaction.CommitAsync();

            return Results.Ok(new { 
                albumId, 
                artistName, 
                albumTitle = title, 
                tracksCount = successfulTracks,
                coverPath 
            });
        })
        .DisableAntiforgery();
    }

    private static async Task<string> ProcessCover(IFormFile? coverFile, string artistName, string title, string coversRoot)
    {
        if (coverFile == null || coverFile.Length == 0)
            return string.Empty; 

        var safeArtistName = SanitizeFileName(artistName);
        var safeTitle = SanitizeFileName(title);

        var artistCoversPath = Path.Combine(coversRoot, safeArtistName);
        if (!Directory.Exists(artistCoversPath))
            Directory.CreateDirectory(artistCoversPath);

        var extension = Path.GetExtension(coverFile.FileName);
        if (string.IsNullOrEmpty(extension)) extension = ".jpg";

        var coverFileName = $"{safeTitle}{extension}";
        var coverFilePath = Path.Combine(artistCoversPath, coverFileName);
        
        using var stream = new FileStream(coverFilePath, FileMode.Create);
        await coverFile.CopyToAsync(stream);
        
        return $"{safeArtistName}/{coverFileName}";
    }

    private static async Task<int> InsertAlbum(SqliteConnection connection, int artistId, string title, int year, string coverPath)
    {
        var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO Albums (ArtistId, Title, Year, Cover, TracksNumber)
            VALUES ($artistId, $title, $year, $cover, 0);
            SELECT last_insert_rowid();
        ";
        
        command.Parameters.AddWithValue("$artistId", artistId);
        command.Parameters.AddWithValue("$title", title);
        command.Parameters.AddWithValue("$year", year);
        command.Parameters.AddWithValue("$cover", coverPath);

        var result = await command.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    private static async Task<int> ProcessTracks(SqliteConnection connection, int albumId, int artistId, 
        string artistName, string albumTitle, IReadOnlyList<IFormFile> trackFiles, string musicRoot)
    {
        var successfulTracks = 0;
        
        var safeArtistName = SanitizeFileName(artistName);
        var safeAlbumTitle = SanitizeFileName(albumTitle);

        var albumMusicPath = Path.Combine(musicRoot, safeArtistName, safeAlbumTitle);
        if (!Directory.Exists(albumMusicPath))
            Directory.CreateDirectory(albumMusicPath);

        for (int i = 0; i < trackFiles.Count; i++)
        {
            var trackFile = trackFiles[i];
            if (trackFile.Length == 0) continue;

            try
            {
                var originalFileName = Path.GetFileName(trackFile.FileName);
                var safeFileName = SanitizeFileName(originalFileName);
                var trackFilePath = Path.Combine(albumMusicPath, safeFileName);
                
                using (var stream = new FileStream(trackFilePath, FileMode.Create))
                {
                    await trackFile.CopyToAsync(stream);
                }
                
                var duration = await AudioService.GetDuration(trackFilePath);
                var title = Path.GetFileNameWithoutExtension(originalFileName);
                
                var dbPath = $"{safeArtistName}/{safeAlbumTitle}/{safeFileName}";

                var command = connection.CreateCommand();
                command.CommandText = @"
                    INSERT INTO Tracks (Title, ArtistId, AlbumId, TrackNumber, Duration, Path)
                    VALUES ($title, $artistId, $albumId, $trackNumber, $duration, $path)
                ";
                
                command.Parameters.AddWithValue("$title", title);
                command.Parameters.AddWithValue("$artistId", artistId);
                command.Parameters.AddWithValue("$albumId", albumId);
                command.Parameters.AddWithValue("$trackNumber", i + 1);
                command.Parameters.AddWithValue("$duration", duration);
                command.Parameters.AddWithValue("$path", dbPath);
                
                await command.ExecuteNonQueryAsync();
                successfulTracks++;
            }
            catch
            {
            }
        }

        return successfulTracks;
    }

    private static async Task UpdateAlbumTrackCount(SqliteConnection connection, int albumId, int tracksCount)
    {
        var command = connection.CreateCommand();
        command.CommandText = "UPDATE Albums SET TracksNumber = $tracksNumber WHERE AlbumId = $albumId";
        command.Parameters.AddWithValue("$tracksNumber", tracksCount);
        command.Parameters.AddWithValue("$albumId", albumId);
        await command.ExecuteNonQueryAsync();
    }

    private static string SanitizeFileName(string name)
    {
        string invalidChars = Regex.Escape(new string(Path.GetInvalidFileNameChars()));
        string invalidRegStr = string.Format(@"([{0}]*\.+$)|([{0}]+)", invalidChars);
        return Regex.Replace(name, invalidRegStr, "_");
    }
}