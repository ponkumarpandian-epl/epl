namespace Epl.Application.Gallery.Dtos;

public record GalleryImage(
    string Url,
    string Alt,
    int? Width,
    int? Height,
    string? Category);

public record GalleryResponse(
    IReadOnlyList<GalleryImage> Items,
    int Total,
    DateTimeOffset GeneratedAt);
