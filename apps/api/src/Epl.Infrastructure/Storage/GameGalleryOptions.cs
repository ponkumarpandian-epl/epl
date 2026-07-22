namespace Epl.Infrastructure.Storage;

internal sealed class GameGalleryOptions
{
    public const string SectionName = "GameGallery";

    public string AccountUri { get; init; } = string.Empty;
    public string PublicBaseUrl { get; init; } = string.Empty;
    public string Container { get; init; } = "season2";
    public string? ConnectionString { get; init; }
    public string[] Prefixes { get; init; } = ["cricket/", "badminton/", "volleyball/"];
}
