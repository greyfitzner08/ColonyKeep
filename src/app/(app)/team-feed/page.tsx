import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { TeamFeed } from "@/components/team/team-feed";
import type { TeamAnnouncement } from "@/lib/types";

function upcomingBirthdays(applications: { full_name: string; birthday: string }[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 14);

  return applications
    .filter((app) => {
      const bday = new Date(`${app.birthday}T12:00:00`);
      const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYear < today) {
        thisYear.setFullYear(thisYear.getFullYear() + 1);
      }
      return thisYear >= today && thisYear <= horizon;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.birthday}T12:00:00`);
      const dateB = new Date(`${b.birthday}T12:00:00`);
      const wrapA = new Date(today.getFullYear(), dateA.getMonth(), dateA.getDate());
      const wrapB = new Date(today.getFullYear(), dateB.getMonth(), dateB.getDate());
      if (wrapA < today) wrapA.setFullYear(wrapA.getFullYear() + 1);
      if (wrapB < today) wrapB.setFullYear(wrapB.getFullYear() + 1);
      return wrapA.getTime() - wrapB.getTime();
    });
}

export default async function TeamFeedPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  let query = supabase
    .from("team_announcements")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (profile?.role !== "admin") {
    const teamFilter = profile?.team_id
      ? `team_id.is.null,team_id.eq.${profile.team_id}`
      : "team_id.is.null";
    query = query.or(teamFilter);
  }

  const [{ data: announcements }, { data: birthdayApps }] = await Promise.all([
    query,
    supabase
      .from("volunteer_applications")
      .select("full_name, birthday")
      .eq("status", "approved")
      .not("birthday", "is", null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Feed</h1>
        <p className="text-muted-foreground">
          Celebrate birthdays, volunteer wins, and milestones together
        </p>
      </div>
      <TeamFeed
        announcements={(announcements ?? []) as TeamAnnouncement[]}
        profile={profile}
        upcomingBirthdays={upcomingBirthdays((birthdayApps ?? []) as { full_name: string; birthday: string }[])}
      />
    </div>
  );
}
