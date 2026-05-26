using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface IApartmentRepository : IRepository<Apartment>
{
    /// <summary>
    /// Lookup an apartment by lat/lng rounded to 6 decimals (~11cm precision).
    /// </summary>
    Task<Apartment?> FindNearAsync(double lat, double lng, CancellationToken ct = default);
}
