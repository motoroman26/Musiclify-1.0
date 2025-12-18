using Microsoft.AspNetCore.StaticFiles;

namespace Musiclify.Startup;

public static class ServicesConfiguration
{
    public static void Configure(WebApplicationBuilder builder)
    {
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        builder.Services.AddLogging();

        builder.Services.Configure<IISServerOptions>(options =>
        {
            options.MaxRequestBodySize = 500 * 1024 * 1024;
        });

        builder.WebHost.ConfigureKestrel(options =>
        {
            options.Limits.MaxRequestBodySize = 500 * 1024 * 1024;
        });

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
                policy.WithOrigins(
                    "http://127.0.0.1:5500",
                    "http://localhost:5500",
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "http://localhost:8080",
                    "http://127.0.0.1:8080"
                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()
                .WithExposedHeaders("Content-Type", "Content-Length", "Content-Disposition");
            });
        });

        builder.Services.AddSingleton<FileExtensionContentTypeProvider>();
    }
}