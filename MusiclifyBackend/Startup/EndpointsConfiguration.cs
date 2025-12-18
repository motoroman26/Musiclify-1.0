using Musiclify.Endpoints;

namespace Musiclify.Startup;

public class EndpointsConfiguration
{
    private readonly WebApplication _app;
    private readonly DatabaseConfiguration _dbConfig;

    public EndpointsConfiguration(WebApplication app, DatabaseConfiguration dbConfig)
    {
        _app = app;
        _dbConfig = dbConfig;
    }

    public void Configure()
    {
        _app.MapAuthEndpoints(_dbConfig.ConnectionString);
        
        _app.MapAlbumEndpoints(_dbConfig.ConnectionString, _dbConfig.CoversRoot);
        _app.MapArtistEndpoints(_dbConfig.ConnectionString);
        
        _app.MapTrackEndpoints(_dbConfig.ConnectionString);
        
        _app.MapTrackSearchEndpoints(_dbConfig.ConnectionString);

        _app.MapGet("/api/test", () => 
            Results.Ok(new { message = "Musiclify API is running", timestamp = DateTime.Now }))
            .WithName("TestAPI");

        _app.MapFallback("/api/{*path}", () => 
            Results.NotFound(new { message = "API endpoint not found" }));
    }
}