using System.Security.Claims;
using Epl.Application.Auth.Dtos;
using Epl.Domain.Common;

namespace Epl.Application.Auth.Services;

public interface IAuthService
{
    Task<Result<MeResponse>> RegisterAsync(RegisterRequest req, CancellationToken ct = default);
    Task<MeResponse?> GetMeAsync(ClaimsPrincipal user, CancellationToken ct = default);
}
