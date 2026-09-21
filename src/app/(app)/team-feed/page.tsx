import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { TeamFeed } from "@/components/team/team-feed";
import { TeamFeedSeenTracker } from "@/components/layout/team-feed-seen-tracker";
import { announcementVisibleToProfile } from "@/lib/team-feed/visibility";
import type { TeamAnnouncement } from "@/lib/types";

export default async function TeamFeedPage() {
  const supabase = await createClient();
  const service = await createServiceClient();
  const profile = await getAppProfile();

  const [{ data: announcementsRaw }, { data: profilesWithBirthdays }, { data: trapTeams }] =
    await Promise.all([
      supabase
        .from("team_announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false }),
      service
        .from("profiles")
        .select("full_name, birthday, email")
        .not("birthday", "is", null)
        .not("full_name", "is", null),
      supabase.from("trap_teams").select("id, name").eq("is_active", true).order("name"),
    ]);

  const announcements = ((announcementsRaw ?? []) as TeamAnnouncement[]).filter((post) =>
    announcementVisibleToProfile(post, profile)
  );

  const birthdayPeople = (profilesWithBirthdays ?? [])
    .filter((p) => p.full_name && p.birthday)
    .map((p) => ({ full_name: p.full_name as string, birthday: p.birthday as string }));

  return (
    <div className="space-y-6">
      {profile?.id && <TeamFeedSeenTracker profileId={profile.id} />}
      <PageHeader
        title="Team Feed"
        description="Share updates with everyone, your trap team, or specific roles"
      />
      <TeamFeed
        announcements={announcements}
        profile={profile}
        trapTeams={trapTeams ?? []}
        birthdayPeople={birthdayPeople}
      />
    </div>
  );
}
