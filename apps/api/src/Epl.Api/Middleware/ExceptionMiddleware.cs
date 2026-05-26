using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> log, IHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            var cid = ctx.Items["CorrelationId"]?.ToString();
            log.LogError(ex, "Unhandled exception on {Method} {Path} ({CorrelationId})", ctx.Request.Method, ctx.Request.Path, cid);

            var problem = new ProblemDetails
            {
                Type     = "about:blank",
                Title    = "An unexpected error occurred.",
                Status   = StatusCodes.Status500InternalServerError,
                Instance = ctx.Request.Path,
                Detail   = env.IsDevelopment() ? ex.Message : null,
            };
            problem.Extensions["correlationId"] = cid;

            ctx.Response.StatusCode  = problem.Status.Value;
            ctx.Response.ContentType = "application/problem+json";
            await ctx.Response.WriteAsJsonAsync(problem);
        }
    }
}
