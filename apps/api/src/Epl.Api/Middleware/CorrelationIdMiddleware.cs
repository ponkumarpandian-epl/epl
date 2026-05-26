using Serilog.Context;

namespace Epl.Api.Middleware;

public class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string Header = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext ctx)
    {
        var cid = ctx.Request.Headers[Header].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(cid)) cid = Guid.NewGuid().ToString("n");

        ctx.Response.Headers[Header] = cid;
        ctx.Items["CorrelationId"]   = cid;

        using (LogContext.PushProperty("CorrelationId", cid))
        {
            await next(ctx);
        }
    }
}
