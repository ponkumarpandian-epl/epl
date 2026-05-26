namespace Epl.Domain.Common;

public readonly record struct ResultError(string Code, string Message);

public class Result<T>
{
    public T? Value { get; }
    public ResultError? Error { get; }
    public bool IsSuccess => Error is null;

    private Result(T value)        { Value = value; }
    private Result(ResultError err){ Error = err; }

    public static Result<T> Ok(T value) => new(value);
    public static Result<T> Fail(string code, string message) => new(new ResultError(code, message));
}
