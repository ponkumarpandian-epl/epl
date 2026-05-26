using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class ApartmentRepository(AppDbContext db) : Repository<Apartment>(db), IApartmentRepository
{
    public Task<Apartment?> FindNearAsync(double lat, double lng, CancellationToken ct = default)
    {
        var roundedLat = Math.Round(lat, 6);
        var roundedLng = Math.Round(lng, 6);

        // No AsNoTracking — the apartment is reused as a navigation on the new Team
        // so EF must track it; otherwise SaveChanges tries to re-insert and violates the unique index.
        return Set
            .Where(a => Math.Abs(a.Lat - roundedLat) < 0.000001
                     && Math.Abs(a.Lng - roundedLng) < 0.000001)
            .FirstOrDefaultAsync(ct);
    }
}
