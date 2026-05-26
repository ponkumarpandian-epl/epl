using System.Linq.Expressions;

namespace Epl.Domain.Abstractions;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<T>> ListAsync(CancellationToken ct = default);
    IQueryable<T> Query();
    T Add(T entity);
    void Remove(T entity);
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
}
