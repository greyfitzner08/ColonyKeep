import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { TeamFeed } from "@/components/team/team-feed";
import type { TeamAnnouncement } from "@/lib/types";

export default async function TeamFeedPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  let query = supabase
    .from("team_announcements")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (profile?.team_id && profile.role !== "admin") {
    query = query.or(`team_id.is.null,team_id.eq.${profile.team_id}`);
  }

  const { data: announcements } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Feed</h1>
        <p className="text-muted-foreground">Announcements and updates from your team</p>
      </div>
      <TeamFeed
        announcements={(announcements ?? []) as TeamAnnouncement[]}
        profile={profile}
      />
    </div>
  );
}
