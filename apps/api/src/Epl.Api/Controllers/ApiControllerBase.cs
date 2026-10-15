using System.Security.Claims;
using Epl.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

/// <summary>
/// Shared helpers for controllers that need the current user, an admin check, or a
/// uniform <see cref="ResultError"/> → HTTP status mapping.
/// </summary>
public abstract class ApiControllerBase : ControllerBase
{
    protected bool TryGetUserId(out Guid uid)
        => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out uid);

    protected bool IsAdmin => User.IsInRole(Roles.Admin);

    /// <summary>Maps a domain error code to the conventional HTTP status.</summary>
    protected IActionResult Fail(ResultError err)
    {
        var body = new { code = err.Code, message = err.Message };
        return err.Code switch
        {
            "forbidden"                                          => StatusCode(StatusCodes.Status403Forbidden, body),
            var c when c.EndsWith("_not_found")                  => NotFound(body),
            "already_member" or "already_on_a_team"
                or "duplicate_team" or "role_conflict"
                or "last_admin"                                  => Conflict(body),
            _                                                    => BadRequest(body),
        };
    }
}
