using Epl.Application.Teams.Dtos;
using FluentValidation;

namespace Epl.Application.Teams.Validators;

public class CreateTeamRequestValidator : AbstractValidator<CreateTeamRequest>
{
    public CreateTeamRequestValidator()
    {
        // Either SeasonGameId or Sport must be present — the service resolves one
        // from the other. Sport is the only thing the public form has, so it stays
        // accepted; SeasonGameId trumps it when provided.
        RuleFor(r => r)
            .Must(r => r.SeasonGameId.HasValue || Enum.IsDefined(typeof(Domain.Entities.Sport), r.Sport))
            .WithMessage("Either seasonGameId or a valid sport must be provided.");

        When(r => !r.SeasonGameId.HasValue, () => RuleFor(r => r.Sport).IsInEnum());

        RuleFor(r => r.ApartmentName).NotEmpty().MinimumLength(2).MaximumLength(120);
        RuleFor(r => r.TeamName).NotEmpty().MinimumLength(2).MaximumLength(60);
        RuleFor(r => r.CaptainName).NotEmpty().MinimumLength(2).MaximumLength(80);

        RuleFor(r => r.CaptainMobile)
            .NotEmpty()
            .Matches(@"^[6-9]\d{9}$")
            .WithMessage("Enter a valid 10-digit Indian mobile number.");

        RuleFor(r => r.ApartmentLat).InclusiveBetween(-90,  90);
        RuleFor(r => r.ApartmentLng).InclusiveBetween(-180, 180);
        RuleFor(r => r.ApartmentAddress).NotEmpty().MinimumLength(3).MaximumLength(400);
    }
}
