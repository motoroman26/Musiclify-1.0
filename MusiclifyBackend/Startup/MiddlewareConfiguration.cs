namespace Musiclify.Startup;

public static class MiddlewareConfiguration
{
    public static void Configure(WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
            app.UseDeveloperExceptionPage();
        }

        app.Use(async (context, next) =>
        {
            context.Request.EnableBuffering();
            await next();
        });

        app.UseCors("AllowFrontend");
        app.UseHttpsRedirection();
    }
}