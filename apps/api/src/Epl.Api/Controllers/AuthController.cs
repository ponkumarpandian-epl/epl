using Epl.Application.Auth.Dtos;
using Epl.Application.Auth.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        var result = await auth.RegisterAsync(req, ct);
        if (!result.IsSuccess)
        {
            return BadRequest(new
            {
                code    = result.Error!.Value.Code,
                message = result.Error!.Value.Message,
            });
        }
        return Ok(result.Value);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var me = await auth.GetMeAsync(User, ct);
        return me is null ? Unauthorized() : Ok(me);
    }
}
