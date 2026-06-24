import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { TeamFeed } from "@/components/team/team-feed";
import { announcementVisibleToProfile } from "@/lib/team-feed/visibility";
import type { TeamAnnouncement } from "@/lib/types";

function upcomingBirthdays(people: { full_name: string; birthday: string }[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 14);

  return people
    .filter((person) => person.birthday)
    .filter((person) => {
      const bday = new Date(`${person.birthday}T12:00:00`);
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
  const service = await createServiceClient();
  const profile = await getCurrentProfile();

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
      <div>
        <h1 className="text-3xl font-bold">Team Feed</h1>
        <p className="text-muted-foreground">
          Share updates with everyone, your trap team, or specific roles
        </p>
      </div>
      <TeamFeed
        announcements={announcements}
        profile={profile}
        trapTeams={trapTeams ?? []}
        upcomingBirthdays={upcomingBirthdays(birthdayPeople)}
      />
    </div>
  );
}
