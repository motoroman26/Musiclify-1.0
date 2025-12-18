using Musiclify.Endpoints.Helpers;

namespace Musiclify.Endpoints;

public static class AlbumEndpoints
{
    public static void MapAlbumEndpoints(this WebApplication app, string connectionString, string coversRoot)
    {
        AlbumAddEndpoints.Map(app, connectionString, coversRoot);
        AlbumGetEndpoints.Map(app, connectionString);
        AlbumSearchEndpoints.Map(app, connectionString);
    }
}