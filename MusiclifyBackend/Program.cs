using Musiclify.Startup;

var builder = WebApplication.CreateBuilder(args);
ServicesConfiguration.Configure(builder);

var app = builder.Build();
MiddlewareConfiguration.Configure(app);

var dbConfig = new DatabaseConfiguration(app);
dbConfig.Initialize();

var endpointsConfig = new EndpointsConfiguration(app, dbConfig);
endpointsConfig.Configure();

var staticFilesConfig = new StaticFilesConfiguration(app, dbConfig);
staticFilesConfig.Configure();

app.MapGet("/", async context =>
{
    context.Response.Redirect("/index.html");
    await Task.CompletedTask;
});

app.Run();