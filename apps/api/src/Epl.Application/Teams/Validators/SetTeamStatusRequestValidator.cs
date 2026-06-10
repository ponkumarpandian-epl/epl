using Epl.Application.Teams.Dtos;
using FluentValidation;

namespace Epl.Application.Teams.Validators;

public class SetTeamStatusRequestValidator : AbstractValidator<SetTeamStatusRequest>
{
    public SetTeamStatusRequestValidator()
    {
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Comment).MaximumLength(500);
    }
}
