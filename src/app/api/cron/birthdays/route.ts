import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("full_name, email, birthday, team_id")
    .not("birthday", "is", null)
    .not("full_name", "is", null);

  const birthdayVolunteers = (profiles ?? []).filter((profile) => {
    const bday = new Date(`${profile.birthday}T12:00:00`);
    return bday.getMonth() + 1 === month && bday.getDate() === day;
  });

  for (const volunteer of birthdayVolunteers) {
    const teamId = volunteer.team_id;
    let teamName: string | null = null;

    if (teamId) {
      const { data: team } = await supabase
        .from("trap_teams")
        .select("name")
        .eq("id", teamId)
        .single();
      teamName = team?.name ?? null;
    }

    const { data: existing } = await supabase
      .from("team_announcements")
      .select("id")
      .eq("is_birthday", true)
      .eq("birthday_person_name", volunteer.full_name)
      .gte("created_at", today.toISOString().split("T")[0])
      .limit(1);

    if (existing && existing.length > 0) continue;

    await supabase.from("team_announcements").insert({
      message: `🎂 Happy Birthday to ${volunteer.full_name}! Wishing you a wonderful day from the whole team!`,
      team_id: teamId,
      team_name: teamName,
      author_email: "system@tnvr-rescue.org",
      author_name: "TNVR System",
      is_birthday: true,
      birthday_person_name: volunteer.full_name,
      pinned: false,
      audience: "all",
    });
  }

  return NextResponse.json({
    processed: birthdayVolunteers.length,
    date: today.toISOString().split("T")[0],
  });
}
