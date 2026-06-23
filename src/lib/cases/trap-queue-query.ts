import type { SupabaseClient } from "@supabase/supabase-js";
import type { HelpRequestStatus } from "@/lib/types";

export const TRAP_KANBAN_STATUSES: HelpRequestStatus[] = [
  "routed_to_trap_team",
  "claimed",
  "appointment_needed",
  "appointment_reserved",
  "cat_trapped",
  "transported",
  "checked_in",
];

export type TrapQueueView = "mine" | "unassigned" | "all" | string;

interface TrapQueueQueryOptions {
  view: TrapQueueView;
  teamId: string | null;
  userEmail: string;
}

export function buildTrapQueueQuery(
  supabase: SupabaseClient,
  { view, teamId, userEmail }: TrapQueueQueryOptions
) {
  let query = supabase
    .from("help_requests")
    .select("*")
    .in("status", TRAP_KANBAN_STATUSES)
    .order("created_at", { ascending: false });

  if (view === "all") {
    return query;
  }

  if (view === "unassigned") {
    return query.is("assigned_team_id", null);
  }

  if (view === "mine") {
    if (teamId) {
      return query.or(`assigned_team_id.eq.${teamId},claimed_by_email.eq.${userEmail}`);
    }
    return query.eq("claimed_by_email", userEmail);
  }

  return query.eq("assigned_team_id", view);
}

export function trapQueueViewLabel(
  view: TrapQueueView,
  teams: { id: string; name: string }[],
  myTeamName?: string | null
): string {
  if (view === "mine") {
    return myTeamName ? `My Team (${myTeamName})` : "My Work";
  }
  if (view === "unassigned") return "Unassigned Pool";
  if (view === "all") return "All Teams";
  return teams.find((team) => team.id === view)?.name ?? "Team Queue";
}
