namespace Epl.Domain.Entities;

/// <summary>
/// Owned type — stored as JSON inside the parent <see cref="SeasonGame"/> row.
/// </summary>
public class SeasonGameContact
{
    public string Name { get; set; } = string.Empty;
    public string PhoneDisplay { get; set; } = string.Empty;   // "97902 42834"
    public string PhoneE164    { get; set; } = string.Empty;   // "+919790242834"
}
