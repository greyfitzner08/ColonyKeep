import type { Profile, TeamAnnouncement, UserRole, VolunteerRole } from "@/lib/types";

export type FeedAudience = "all" | "team" | "roles";

export function announcementVisibleToProfile(
  post: Pick<TeamAnnouncement, "audience" | "team_id" | "view_roles">,
  profile: Profile | null
): boolean {
  if (!profile?.role) return false;
  if (profile.role === "admin") return true;

  const audience = (post.audience ?? "all") as FeedAudience;

  if (audience === "all" || !audience) return true;

  if (audience === "team") {
    if (!post.team_id) return true;
    return profile.team_id === post.team_id;
  }

  if (audience === "roles") {
    const targets = post.view_roles ?? [];
    if (targets.length === 0) return true;

    const platformRoles = targets.filter((role): role is UserRole =>
      ["admin", "inquiry_team", "trap_team_lead", "clinic_coordination", "volunteer"].includes(role)
    );
    const volunteerTargets = targets.filter(
      (role) => !platformRoles.includes(role as UserRole)
    ) as VolunteerRole[];

    if (platformRoles.includes(profile.role)) return true;
    if (volunteerTargets.some((role) => (profile.volunteer_roles ?? []).includes(role))) {
      return true;
    }
    return false;
  }

  return true;
}
