import { birthdaysWithinDays, type BirthdayPerson } from "@/lib/team-feed/birthdays";
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
  const [{ data: announcementsRaw }, { data: profilesWithBirthdays }] = await Promise.all([
    supabase
      .from("team_announcements")
      .select("created_at, audience, team_id, team_ids, view_roles")
      .order("created_at", { ascending: false }),
    service
      .from("profiles")
      .select("full_name, birthday")
      .not("birthday", "is", null)
      .not("full_name", "is", null),
  ]);

  const visible = ((announcementsRaw ?? []) as TeamAnnouncement[]).filter((post) =>
    announcementVisibleToProfile(post, profile)
  );

  const birthdayPeople: BirthdayPerson[] = (profilesWithBirthdays ?? [])
    .filter((person) => person.full_name && person.birthday)
    .map((person) => ({
      full_name: person.full_name as string,
      birthday: person.birthday as string,
    }));

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
