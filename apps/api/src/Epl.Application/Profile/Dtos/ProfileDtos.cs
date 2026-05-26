using Epl.Domain.Entities;

namespace Epl.Application.Profile.Dtos;

public record ProfileSkillDto(Guid GameId, string GameName, string GameSlug, SkillLevel Level);

public record ProfileResponse(
    Guid     Id,
    string   FullName,
    string?  Email,
    string?  PhoneNumber,
    string?  AvatarUrl,
    IReadOnlyList<string>        Roles,
    IReadOnlyList<ProfileSkillDto> Skills);

public record SkillUpdateInput(Guid GameId, SkillLevel Level);

public record UpdateSkillsRequest(IReadOnlyList<SkillUpdateInput> Skills);
