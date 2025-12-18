using TagLib;
using MediaToolkit;
using MediaToolkit.Model;

namespace Musiclify.Services;

public static class AudioService
{
    public static async Task<int> GetDuration(string filePath)
    {
        try
        {
            await Task.Delay(100);

            var inputFile = new MediaFile { Filename = filePath };
            using var engine = new Engine();
            engine.GetMetadata(inputFile);
            
            return (int)inputFile.Metadata.Duration.TotalSeconds;
        }
        catch
        {
            try
            {
                using var file = TagLib.File.Create(filePath);
                return (int)file.Properties.Duration.TotalSeconds;
            }
            catch
            {
                return 0;
            }
        }
    }
}