import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { TeamFeed } from "@/components/team/team-feed";
import { TeamFeedSeenTracker } from "@/components/layout/team-feed-seen-tracker";
import { loadBirthdayPeople } from "@/lib/team-feed/load-birthday-people";
import { announcementVisibleToProfile } from "@/lib/team-feed/visibility";
import type { TeamAnnouncement } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeamFeedPage() {
  const supabase = await createClient();
  const service = await createServiceClient();
  const profile = await getAppProfile();

  const [{ data: announcementsRaw }, birthdayPeople, { data: trapTeams }] = await Promise.all([
    supabase
      .from("team_announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    loadBirthdayPeople(service),
    supabase.from("trap_teams").select("id, name").eq("is_active", true).order("name"),
  ]);

  const announcements = ((announcementsRaw ?? []) as TeamAnnouncement[]).filter((post) =>
    announcementVisibleToProfile(post, profile)
  );

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
