using Epl.Application.Gallery.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

[ApiController]
[Route("api/gallery")]
public class GalleryController(IGalleryService gallery) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(Duration = 300)]   // 5-minute browser cache; CDN can override
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var data = await gallery.ListAsync(ct);
        return Ok(data);
    }
}
