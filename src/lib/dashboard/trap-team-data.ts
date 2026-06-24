import type { SupabaseClient } from "@supabase/supabase-js";
import type { HelpRequest, TeamAnnouncement } from "@/lib/types";

export interface TrapTeamDashboardData {
  team: {
    id: string;
    name: string;
    region: string;
    lead_email: string;
    members: string[];
  };
  stats: {
    memberCount: number;
    activeCases: number;
    totalHours: number;
  };
  casesByMember: Record<
    string,
    { displayName: string; cases: Pick<HelpRequest, "id" | "case_number" | "status">[] }
  >;
  unclaimedCases: Pick<HelpRequest, "id" | "case_number" | "status">[];
  hoursByMember: Record<string, number>;
  announcements: Pick<TeamAnnouncement, "id" | "message" | "created_at">[];
}

export async function fetchTrapTeamDashboardData(
  service: SupabaseClient,
  supabase: SupabaseClient,
  teamId: string
): Promise<TrapTeamDashboardData | null> {
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
      .select("id, message, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (!team) return null;

  const members = (team.members ?? []) as string[];

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

  const casesByMember: TrapTeamDashboardData["casesByMember"] = {};
  for (const email of members) {
    const memberCases = cases.filter(
      (hr) => hr.claimed_by_email?.toLowerCase() === email.toLowerCase()
    );
    casesByMember[email] = {
      displayName: memberCases[0]?.claimed_by_name ?? email,
      cases: memberCases.map((c) => ({
        id: c.id,
        case_number: c.case_number,
        status: c.status,
      })),
    };
  }

  const unclaimedCases = cases
    .filter((hr) => !hr.claimed_by_email && hr.assigned_team_id === teamId)
    .map((c) => ({ id: c.id, case_number: c.case_number, status: c.status }));

  const hoursByMember = (hours ?? []).reduce<Record<string, number>>((acc, entry) => {
    acc[entry.volunteer_email] = (acc[entry.volunteer_email] ?? 0) + Number(entry.hours);
    return acc;
  }, {});

  const totalHours = Object.values(hoursByMember).reduce((sum, value) => sum + value, 0);

  return {
    team: {
      id: team.id,
      name: team.name,
      region: team.region,
      lead_email: team.lead_email,
      members,
    },
    stats: {
      memberCount: members.length,
      activeCases: cases.length,
      totalHours,
    },
    casesByMember,
    unclaimedCases,
    hoursByMember,
    announcements: (announcements ?? []) as TrapTeamDashboardData["announcements"],
  };
}
