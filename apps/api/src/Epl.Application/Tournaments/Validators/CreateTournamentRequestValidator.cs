using Epl.Application.Tournaments.Dtos;
using FluentValidation;

namespace Epl.Application.Tournaments.Validators;

public class CreateTournamentRequestValidator : AbstractValidator<CreateTournamentRequest>
{
    public CreateTournamentRequestValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MinimumLength(3).MaximumLength(120);
        RuleFor(r => r.Slug)
            .NotEmpty()
            .Matches(@"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")
            .WithMessage("Slug must be lowercase letters, digits, and hyphens.")
            .MaximumLength(60);
        RuleFor(r => r.GameId).NotEqual(Guid.Empty);
        RuleFor(r => r.Tagline).MaximumLength(200);
        RuleFor(r => r.Description).MaximumLength(1200);
        RuleFor(r => r.Venue).MaximumLength(200);
        RuleFor(r => r.BannerImageUrl).MaximumLength(400);
        RuleFor(r => r.WhatsAppGroupUrl).MaximumLength(400);
        RuleFor(r => r.EntryFeeRupees).GreaterThanOrEqualTo(0);

        When(r => r.StartsOn.HasValue && r.EndsOn.HasValue, () =>
        {
            RuleFor(r => r.EndsOn!.Value)
                .GreaterThanOrEqualTo(r => r.StartsOn!.Value)
                .WithMessage("End date must be on or after the start date.");
        });

        When(r => r.RegistrationDeadline.HasValue && r.StartsOn.HasValue, () =>
        {
            RuleFor(r => r.RegistrationDeadline!.Value)
                .LessThanOrEqualTo(r => r.StartsOn!.Value)
                .WithMessage("Registration must close on or before the tournament starts.");
        });

        RuleForEach(r => r.Categories).SetValidator(new UpsertTournamentCategoryRequestValidator());
        RuleForEach(r => r.Contacts).ChildRules(c =>
        {
            c.RuleFor(x => x.Name).NotEmpty().MaximumLength(80);
            c.RuleFor(x => x.PhoneDisplay).NotEmpty().MaximumLength(20);
            c.RuleFor(x => x.PhoneE164).NotEmpty().Matches(@"^\+\d{8,15}$");
        });
    }
}

public class UpsertTournamentCategoryRequestValidator : AbstractValidator<UpsertTournamentCategoryRequest>
{
    public UpsertTournamentCategoryRequestValidator()
    {
        RuleFor(c => c.Name).NotEmpty().MinimumLength(2).MaximumLength(60);
        RuleFor(c => c.Format).IsInEnum();
        RuleFor(c => c.MinEntries).GreaterThanOrEqualTo(2).LessThanOrEqualTo(256);
        RuleFor(c => c.MaxEntries).GreaterThanOrEqualTo(c => c.MinEntries).LessThanOrEqualTo(256);
        RuleFor(c => c.EntryFeeRupees).GreaterThanOrEqualTo(0);
    }
}
