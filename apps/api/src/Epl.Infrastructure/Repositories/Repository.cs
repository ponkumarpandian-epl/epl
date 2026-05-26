using System.Linq.Expressions;
using Epl.Domain.Abstractions;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public abstract class Repository<T>(AppDbContext db) : IRepository<T> where T : class
{
    protected readonly AppDbContext Db = db;
    protected readonly DbSet<T> Set = db.Set<T>();

    public virtual Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Set.FindAsync(new object?[] { id }, ct).AsTask();

    public virtual Task<List<T>> ListAsync(CancellationToken ct = default)
        => Set.AsNoTracking().ToListAsync(ct);

    public virtual IQueryable<T> Query() => Set.AsQueryable();

    public virtual T Add(T entity)
    {
        Set.Add(entity);
        return entity;
    }

    public virtual void Remove(T entity) => Set.Remove(entity);

    public virtual Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
        => Set.AsNoTracking().AnyAsync(predicate, ct);
}
