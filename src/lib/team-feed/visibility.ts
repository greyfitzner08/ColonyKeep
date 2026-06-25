import type { Profile, TeamAnnouncement, UserRole, VolunteerRole } from "@/lib/types";

export type FeedAudience = "all" | "team" | "roles";

function postTeamIds(post: Pick<TeamAnnouncement, "team_id" | "team_ids">): string[] {
  if (post.team_ids?.length) return post.team_ids;
  return post.team_id ? [post.team_id] : [];
}

export function announcementVisibleToProfile(
  post: Pick<TeamAnnouncement, "audience" | "team_id" | "team_ids" | "view_roles">,
  profile: Profile | null
): boolean {
  if (!profile?.role) return false;
  if (profile.role === "admin") return true;

  const audience = (post.audience ?? "all") as FeedAudience;

  if (audience === "all" || !audience) return true;

  if (audience === "team") {
    const ids = postTeamIds(post);
    if (ids.length === 0) return true;
    return Boolean(profile.team_id && ids.includes(profile.team_id));
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
