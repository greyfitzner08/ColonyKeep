import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { canViewTeamDashboard } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { HelpRequest } from "@/lib/types";

interface TeamDashboardPageProps {
  searchParams: Promise<{ team?: string }>;
}

type HoursByMember = Record<string, number>;

export default async function TeamDashboardPage({ searchParams }: TeamDashboardPageProps) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  if (!canViewTeamDashboard(profile)) {
    redirect("/");
  }

  const supabase = await createClient();
  const service = await createServiceClient();

  const teamId =
    profile?.role === "admin" && params.team
      ? params.team
      : profile?.team_id ?? params.team ?? null;

  const { data: teams } = await supabase.from("trap_teams").select("id, name").eq("is_active", true);

  if (!teamId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Dashboard</h1>
          <p className="text-muted-foreground">
            Select a trap team to see what members are working on.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(teams ?? []).map((team) => (
            <Button key={team.id} asChild variant="outline" className="h-auto py-4 justify-start">
              <Link href={`/team-dashboard?team=${team.id}`}>{team.name}</Link>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const [{ data: team }, { data: hours }, { data: announcements }] = await Promise.all([
    supabase.from("trap_teams").select("*").eq("id", teamId).single(),
    supabase
      .from("volunteer_hours")
      .select("*")
      .eq("team_id", teamId)
      .order("date", { ascending: false })
      .limit(20),
    supabase
      .from("team_announcements")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const members = (team?.members ?? []) as string[];

  const { data: assignedCases } = await service
    .from("help_requests")
    .select("id, case_number, status, claimed_by_email, claimed_by_name, assigned_team_id")
    .eq("assigned_team_id", teamId)
    .not("status", "in", '("completed","closed")')
    .order("updated_at", { ascending: false });

  const { data: claimedCases } =
    members.length > 0
      ? await service
          .from("help_requests")
          .select("id, case_number, status, claimed_by_email, claimed_by_name, assigned_team_id")
          .in("claimed_by_email", members)
          .not("status", "in", '("completed","closed")')
          .order("updated_at", { ascending: false })
      : { data: [] };

  const caseMap = new Map<string, HelpRequest>();
  for (const hr of [...(assignedCases ?? []), ...(claimedCases ?? [])] as HelpRequest[]) {
    caseMap.set(hr.id, hr);
  }
  const cases = Array.from(caseMap.values());

  const casesByMember = members.reduce<Record<string, HelpRequest[]>>((acc, email) => {
    acc[email] = cases.filter(
      (hr) => hr.claimed_by_email?.toLowerCase() === email.toLowerCase()
    );
    return acc;
  }, {});

  const unclaimedTeamCases = cases.filter(
    (hr) => !hr.claimed_by_email && hr.assigned_team_id === teamId
  );

  const hoursByMember: HoursByMember = (hours ?? []).reduce(
    (acc, h) => {
      acc[h.volunteer_email] = (acc[h.volunteer_email] ?? 0) + Number(h.hours);
      return acc;
    },
    {} as HoursByMember
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{team?.name ?? "Team Dashboard"}</h1>
          <p className="text-muted-foreground">
            {team?.region ? `${team.region} · ` : ""}
            Lead: {team?.lead_email ?? "—"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/trap-queue">Open trap queue</Link>
        </Button>
      </div>

      {profile?.role === "admin" && (teams?.length ?? 0) > 1 && (
        <div className="flex flex-wrap gap-2">
          {(teams ?? []).map((t) => (
            <Button
              key={t.id}
              asChild
              variant={t.id === teamId ? "default" : "outline"}
              size="sm"
            >
              <Link href={`/team-dashboard?team=${t.id}`}>{t.name}</Link>
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Team Members</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{members.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Active Cases</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{cases.length}</p></CardContent>
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

      <Card>
        <CardHeader>
          <CardTitle>Who is working on what</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cases personally claimed by trap team members, plus unclaimed team assignments.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">No members listed on this team yet.</p>
          )}
          {members.map((email) => {
            const memberCases = casesByMember[email] ?? [];
            const displayName =
              memberCases[0]?.claimed_by_name ??
              email;
            return (
              <div key={email} className="space-y-2">
                <p className="font-medium text-sm">{displayName}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
                {memberCases.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-2">No claimed cases right now.</p>
                ) : (
                  <div className="space-y-1 pl-2">
                    {memberCases.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                        <Link href={`/case/${c.id}`} className="text-primary hover:underline">
                          {c.case_number}
                        </Link>
                        <Badge variant="secondary">{c.status.replace(/_/g, " ")}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {unclaimedTeamCases.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <p className="font-medium text-sm">Unclaimed team assignments</p>
              {unclaimedTeamCases.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/case/${c.id}`} className="text-primary hover:underline">
                    {c.case_number}
                  </Link>
                  <Badge variant="outline">{c.status.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
          <CardHeader><CardTitle>Team Feed Posts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(announcements ?? []).map((a) => (
              <div key={a.id} className="text-sm border-b pb-2">
                <p>{a.message.slice(0, 100)}{a.message.length > 100 ? "..." : ""}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(a.created_at)}</p>
              </div>
            ))}
            {(announcements ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No team-only posts yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
