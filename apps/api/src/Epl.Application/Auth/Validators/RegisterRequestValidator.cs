using Epl.Application.Auth.Common;
using Epl.Application.Auth.Dtos;
using FluentValidation;

namespace Epl.Application.Auth.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(r => r.Identifier)
            .NotEmpty()
            .Must(id => IdentifierParser.Detect(id) != IdentifierKind.Invalid)
            .WithMessage("Enter a valid email address or a 10-digit Indian mobile number.");

        RuleFor(r => r.Password)
            .NotEmpty()
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .Matches("[A-Z]").WithMessage("Password must contain an uppercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain a digit.");

        RuleFor(r => r.FullName)
            .NotEmpty()
            .MinimumLength(2)
            .MaximumLength(120);
    }
}
