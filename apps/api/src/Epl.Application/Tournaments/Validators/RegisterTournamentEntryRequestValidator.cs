using Epl.Application.Tournaments.Dtos;
using FluentValidation;

namespace Epl.Application.Tournaments.Validators;

public class RegisterTournamentEntryRequestValidator : AbstractValidator<RegisterTournamentEntryRequest>
{
    public RegisterTournamentEntryRequestValidator()
    {
        RuleFor(r => r.Player1Name)
            .NotEmpty().WithMessage("Your name is required.")
            .MinimumLength(2).MaximumLength(80);

        RuleFor(r => r.Player1Mobile)
            .NotEmpty().WithMessage("Mobile is required.")
            .Matches(@"^\+\d{8,15}$")
            .WithMessage("Mobile must be in international format (e.g. +91XXXXXXXXXX).");

        // Player2 is optional at the DTO level — service decides whether it's required
        // based on the category Format (Singles vs Doubles).
        When(r => !string.IsNullOrWhiteSpace(r.Player2Name) || !string.IsNullOrWhiteSpace(r.Player2Mobile), () =>
        {
            RuleFor(r => r.Player2Name).NotEmpty().MinimumLength(2).MaximumLength(80);
            RuleFor(r => r.Player2Mobile)
                .NotEmpty()
                .Matches(@"^\+\d{8,15}$")
                .WithMessage("Partner mobile must be in international format.");
        });

        RuleFor(r => r.TeamLabel).MaximumLength(80);
    }
}

public class UpdateEntrySeedRequestValidator : AbstractValidator<UpdateEntrySeedRequest>
{
    public UpdateEntrySeedRequestValidator()
    {
        // null clears the seed; otherwise must be 1..256.
        When(r => r.Seed.HasValue, () =>
        {
            RuleFor(r => r.Seed!.Value)
                .GreaterThanOrEqualTo(1)
                .LessThanOrEqualTo(256);
        });
    }
}

public class UpdateEntryStatusRequestValidator : AbstractValidator<UpdateEntryStatusRequest>
{
    public UpdateEntryStatusRequestValidator()
    {
        RuleFor(r => r.Status).IsInEnum();
    }
}
