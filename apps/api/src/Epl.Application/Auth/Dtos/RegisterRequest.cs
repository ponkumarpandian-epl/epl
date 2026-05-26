namespace Epl.Application.Auth.Dtos;

public record RegisterRequest(
    string Identifier,   // email or 10-digit Indian mobile
    string Password,
    string FullName);
