using Epl.Application.Teams.Dtos;
using FluentValidation;

namespace Epl.Application.Teams.Validators;

public class AddTeamMemberRequestValidator : AbstractValidator<AddTeamMemberRequest>
{
    public AddTeamMemberRequestValidator()
    {
        // Exactly one identity branch: registered (UserId) XOR placeholder (name+mobile).
        RuleFor(x => x).Must(BeExactlyOneIdentity)
            .WithMessage("Provide either a registered user or a name + mobile, not both.");

        When(x => x.UserId is null, () =>
        {
            RuleFor(x => x.PlaceholderName).NotEmpty().MaximumLength(80)
                .WithMessage("Enter the player's name.");
            RuleFor(x => x.PlaceholderMobile).NotEmpty()
                .Matches(@"^(\+91|0)?[6-9]\d{9}$")
                .WithMessage("Enter a valid 10-digit Indian mobile.");
        });

        RuleFor(x => x.ShirtNumber).MaximumLength(10);
        RuleFor(x => x.Position).MaximumLength(60);
    }

    private static bool BeExactlyOneIdentity(AddTeamMemberRequest r)
    {
        var hasUser        = r.UserId is not null;
        var hasPlaceholder = !string.IsNullOrWhiteSpace(r.PlaceholderName)
                          || !string.IsNullOrWhiteSpace(r.PlaceholderMobile);
        return hasUser ^ hasPlaceholder;
    }
}
