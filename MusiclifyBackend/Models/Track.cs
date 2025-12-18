namespace Musiclify.Models;

public class Track
{
    public int TrackId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int ArtistId { get; set; }
    public int AlbumId { get; set; }
    public int TrackNumber { get; set; }
    public int Duration { get; set; }
    public string Path { get; set; } = string.Empty;
}

public class TrackWithDetails : Track
{
    public string ArtistName { get; set; } = string.Empty;
    public string AlbumTitle { get; set; } = string.Empty;
}