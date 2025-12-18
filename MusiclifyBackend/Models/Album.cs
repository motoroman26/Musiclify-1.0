namespace Musiclify.Models;

public class Album
{
    public int AlbumId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Cover { get; set; } = string.Empty;
    public int TracksNumber { get; set; }
    public int ArtistId { get; set; }
}

public class AlbumWithArtist : Album
{
    public string ArtistName { get; set; } = string.Empty;
}