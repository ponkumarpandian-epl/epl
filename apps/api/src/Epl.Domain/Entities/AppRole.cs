using Microsoft.AspNetCore.Identity;

namespace Epl.Domain.Entities;

public class AppRole : IdentityRole<Guid>
{
    public AppRole() { }
    public AppRole(string roleName) : base(roleName) { }
}
