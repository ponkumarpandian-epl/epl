namespace Epl.Domain.Entities;

public class Apartment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public double Lat { get; set; }
    public double Lng { get; set; }
    public string Address { get; set; } = string.Empty;
    public string MapProvider { get; set; } = "osm";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Team> Teams { get; set; } = new List<Team>();
}
