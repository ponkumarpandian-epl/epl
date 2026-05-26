using System.Security.Claims;
using Epl.Application.Profile.Dtos;
using Epl.Application.Profile.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

[ApiController]
[Route("api/profile")]
public class ProfileController(IProfileService profiles) : ControllerBase
{
    private const long MaxAvatarBytes = 4 * 1024 * 1024;   // 4 MB

    /// <summary>Current user's profile (avatar + roles + skills).</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var uid)) return Unauthorized();
        var me = await profiles.GetAsync(uid, ct);
        return me is null ? NotFound() : Ok(me);
    }

    /// <summary>Bulk upsert of the current user's skill levels per game.</summary>
    [HttpPut("skills")]
    [Authorize]
    public async Task<IActionResult> UpdateSkills([FromBody] UpdateSkillsRequest req, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var uid)) return Unauthorized();
        var result = await profiles.UpdateSkillsAsync(uid, req, ct);
        if (!result.IsSuccess)
            return BadRequest(new { code = result.Error!.Value.Code, message = result.Error.Value.Message });
        return Ok(result.Value);
    }

    /// <summary>Multipart upload of the avatar image.</summary>
    [HttpPost("avatar")]
    [Authorize]
    [RequestSizeLimit(MaxAvatarBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxAvatarBytes)]
    public async Task<IActionResult> UploadAvatar([FromForm] IFormFile file, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var uid)) return Unauthorized();
        if (file is null || file.Length == 0)
            return BadRequest(new { code = "empty_upload", message = "No file uploaded." });
        if (file.Length > MaxAvatarBytes)
            return BadRequest(new { code = "too_large", message = "Image too large (max 4 MB)." });

        await using var stream = file.OpenReadStream();
        var result = await profiles.UploadAvatarAsync(uid, stream, file.ContentType, file.FileName, ct);
        if (!result.IsSuccess)
            return BadRequest(new { code = result.Error!.Value.Code, message = result.Error.Value.Message });

        return Ok(new { avatarUrl = result.Value });
    }

    /// <summary>Public — serve the bytes for a user's avatar.</summary>
    [HttpGet("avatar/{userId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvatar(Guid userId, CancellationToken ct)
    {
        var (stream, contentType) = await profiles.OpenAvatarAsync(userId, ct);
        if (stream is null) return NotFound();
        return File(stream, contentType ?? "application/octet-stream");
    }

    private bool TryGetCurrentUserId(out Guid uid)
        => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out uid);
}
