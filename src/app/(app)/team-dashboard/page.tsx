import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type HoursByMember = Record<string, number>;

export default async function TeamDashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile?.team_id && profile?.role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const teamId = profile?.team_id;

  const [{ data: team }, { data: hours }, { data: announcements }, { data: cases }] =
    await Promise.all([
      supabase.from("trap_teams").select("*").eq("id", teamId!).single(),
      supabase.from("volunteer_hours").select("*").eq("team_id", teamId!).order("date", { ascending: false }).limit(20),
      supabase.from("team_announcements").select("*").eq("team_id", teamId!).order("created_at", { ascending: false }).limit(5),
      supabase.from("help_requests").select("id, case_number, status").eq("assigned_team_id", teamId!).not("status", "in", '("completed","closed")'),
    ]);

    const hoursByMember: HoursByMember = (hours ?? []).reduce(
      (acc, h) => {
        acc[h.volunteer_email] = (acc[h.volunteer_email] ?? 0) + Number(h.hours);
        return acc;
      },
      {} as HoursByMember
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{team?.name ?? "Team Dashboard"}</h1>
        <p className="text-muted-foreground">{team?.region} · Lead: {team?.lead_email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Team Members</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{team?.members?.length ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Active Cases</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{cases?.length ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Hours (recent)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Object.values(hoursByMember).reduce((a, b) => a + b, 0).toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Member Hours</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(hoursByMember).map(([email, hrs]) => (
                <div key={email} className="flex justify-between text-sm">
                  <span>{email}</span>
                  <span className="font-medium">{hrs.toFixed(1)} hrs</span>
                </div>
              ))}
              {Object.keys(hoursByMember).length === 0 && (
                <p className="text-muted-foreground text-sm">No hours logged yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Announcements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(announcements ?? []).map((a) => (
              <div key={a.id} className="text-sm border-b pb-2">
                <p>{a.message.slice(0, 100)}{a.message.length > 100 ? "..." : ""}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(a.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Cases</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(cases ?? []).map((c) => (
              <div key={c.id} className="flex justify-between items-center text-sm">
                <a href={`/case/${c.id}`} className="text-primary hover:underline">{c.case_number}</a>
                <Badge variant="secondary">{c.status.replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
