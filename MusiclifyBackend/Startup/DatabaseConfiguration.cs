using Microsoft.Data.Sqlite;

namespace Musiclify.Startup;

public class DatabaseConfiguration
{
    private readonly WebApplication _app;
    public string ConnectionString { get; private set; } = string.Empty;
    public string DbPath { get; private set; } = string.Empty;
    public string CoversRoot { get; private set; } = string.Empty;
    public string MusicRoot { get; private set; } = string.Empty;

    public DatabaseConfiguration(WebApplication app)
    {
        _app = app;
    }

    public void Initialize()
    {
        Console.WriteLine("🔧 Initializing database configuration...");
        
        var currentDir = Directory.GetCurrentDirectory();
        var solutionRoot = FindSolutionRoot(currentDir);
        
        Console.WriteLine($"📁 Solution root: {solutionRoot}");

        CoversRoot = Path.Combine(solutionRoot, "covers");
        MusicRoot = Path.Combine(solutionRoot, "music");
        
        DbPath = Path.Combine(solutionRoot, "database", "Musiclify.db");
        ConnectionString = $"Data Source={DbPath};";

        Console.WriteLine($"📍 Database path: {DbPath}");

        EnsureDirectoriesExist();
        CheckDatabaseConnection();
    }

    private string FindSolutionRoot(string startPath)
    {
        var dir = new DirectoryInfo(startPath);
        while (dir != null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "database")) || 
                File.Exists(Path.Combine(dir.FullName, "Musiclify.sln")))
            {
                return dir.FullName;
            }
            dir = dir.Parent;
        }
        return startPath;
    }

    private void EnsureDirectoriesExist()
    {
        if (!Directory.Exists(CoversRoot)) Directory.CreateDirectory(CoversRoot);
        if (!Directory.Exists(MusicRoot)) Directory.CreateDirectory(MusicRoot);
    }

    private void CheckDatabaseConnection()
    {
        if (!File.Exists(DbPath))
        {
            Console.WriteLine($"❌ Database file not found at {DbPath}");
            return;
        }

        try
        {
            using var connection = new SqliteConnection(ConnectionString);
            connection.Open();
            Console.WriteLine("✅ Database connection successful");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Database error: {ex.Message}");
        }
    }
}