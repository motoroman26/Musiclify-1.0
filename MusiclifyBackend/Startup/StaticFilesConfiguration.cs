using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;

namespace Musiclify.Startup;

public class StaticFilesConfiguration
{
    private readonly WebApplication _app;
    private readonly DatabaseConfiguration _dbConfig;
    private readonly FileExtensionContentTypeProvider _contentTypeProvider;

    public StaticFilesConfiguration(WebApplication app, DatabaseConfiguration dbConfig)
    {
        _app = app;
        _dbConfig = dbConfig;
        _contentTypeProvider = app.Services.GetRequiredService<FileExtensionContentTypeProvider>();
    }

    public void Configure()
    {
        var frontendRoot = FindFrontendFolder();
        if (frontendRoot == null) return;

        var htmlPath = Path.Combine(frontendRoot, "html");

        ConfigurePath(htmlPath, "");
        ConfigurePath(Path.Combine(frontendRoot, "css"), "/css");
        ConfigurePath(Path.Combine(frontendRoot, "js"), "/js");
        ConfigurePath(Path.Combine(frontendRoot, "images"), "/images");
        ConfigurePath(_dbConfig.CoversRoot, "/covers");
        ConfigurePath(_dbConfig.MusicRoot, "/music");

        _app.MapFallbackToFile("index.html", new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(htmlPath)
        });
    }

    private void ConfigurePath(string physicalPath, string requestPath)
    {
        if (!Directory.Exists(physicalPath))
        {
            if (requestPath == "/covers" || requestPath == "/music")
            {
                Directory.CreateDirectory(physicalPath);
            }
            else
            {
                return;
            }
        }

        _app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(physicalPath),
            RequestPath = requestPath,
            ContentTypeProvider = _contentTypeProvider
        });
    }

    private string? FindFrontendFolder()
    {
        string[] possiblePaths = 
        {
            Path.Combine(Directory.GetCurrentDirectory(), "..", "Musiclify"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Musiclify")
        };

        foreach (var path in possiblePaths)
        {
            if (Directory.Exists(path)) return Path.GetFullPath(path);
        }
        return null;
    }
}