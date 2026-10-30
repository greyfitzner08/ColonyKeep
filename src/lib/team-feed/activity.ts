import { birthdaysWithinDays } from "@/lib/team-feed/birthdays";
import { loadBirthdayPeople } from "@/lib/team-feed/load-birthday-people";
import { announcementVisibleToProfile } from "@/lib/team-feed/visibility";
import type { Profile, TeamAnnouncement } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface TeamFeedActivity {
  latestPostAt: string | null;
  hasBirthdaysThisWeek: boolean;
}

export async function fetchTeamFeedActivity(
  supabase: SupabaseClient,
  service: SupabaseClient,
  profile: Profile
): Promise<TeamFeedActivity> {
  const [{ data: announcementsRaw }, birthdayPeople] = await Promise.all([
    supabase
      .from("team_announcements")
      .select("created_at, audience, team_id, team_ids, view_roles")
      .order("created_at", { ascending: false }),
    loadBirthdayPeople(service),
  ]);

  const visible = ((announcementsRaw ?? []) as TeamAnnouncement[]).filter((post) =>
    announcementVisibleToProfile(post, profile)
  );

  return {
    latestPostAt: visible[0]?.created_at ?? null,
    hasBirthdaysThisWeek: birthdaysWithinDays(birthdayPeople, 7).length > 0,
  };
}

export function shouldShowTeamFeedIndicator(
  activity: TeamFeedActivity | null,
  lastSeenAt: string | null,
  isOnTeamFeedPage: boolean
): boolean {
  if (isOnTeamFeedPage || !activity) return false;

  const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;

  const hasNewPosts =
    activity.latestPostAt != null &&
    new Date(activity.latestPostAt).getTime() > lastSeenMs;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const hasBirthdayNotice =
    activity.hasBirthdaysThisWeek && lastSeenMs < todayStart.getTime();

  return hasNewPosts || hasBirthdayNotice;
}
