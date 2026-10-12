import type { SupabaseClient } from "@supabase/supabase-js";
import { TRAP_QUEUE_STATUSES } from "@/lib/cases/statuses";

export { TRAP_KANBAN_STATUSES, TRAP_QUEUE_STATUSES } from "@/lib/cases/statuses";

/** Primary Trap Queue work mode. */
export type TrapQueueFocus = "needs_claim" | "mine";

/** Team scope for the Needs claim list (and closed workspace). */
export type TrapQueueTeamScope = "mine" | "all" | "unassigned" | string;

/** @deprecated Prefer TrapQueueFocus + TrapQueueTeamScope. */
export type TrapQueueView = "mine" | "my_claims" | "unassigned" | "all" | string;

interface TrapQueueQueryOptions {
  teamScope: TrapQueueTeamScope;
  teamId: string | null;
  userEmail: string;
}

export function defaultTrapQueueFocus(): TrapQueueFocus {
  return "needs_claim";
}

/** Default team scope: trappers with a team see their team; everyone else sees all teams. */
export function defaultTrapQueueTeamScope(options: {
  role?: string | null;
  teamId?: string | null;
}): TrapQueueTeamScope {
  if (options.role === "trap_team_lead" && options.teamId) {
    return "mine";
  }
  return "all";
}

/** @deprecated Use defaultTrapQueueTeamScope / defaultTrapQueueFocus. */
export function defaultTrapQueueView(options: {
  role?: string | null;
  teamId?: string | null;
}): TrapQueueView {
  return defaultTrapQueueTeamScope(options) === "mine" ? "mine" : "all";
}

/**
 * Map legacy `view=` URLs onto focus + team scope so old bookmarks keep working.
 */
export function resolveTrapQueueNavigation(options: {
  focusParam?: string | null;
  teamParam?: string | null;
  viewParam?: string | null;
  claimedParam?: string | null;
  role?: string | null;
  teamId?: string | null;
}): {
  focus: TrapQueueFocus;
  teamScope: TrapQueueTeamScope;
  showOthersClaimed: boolean;
} {
  const defaultTeam = defaultTrapQueueTeamScope({
    role: options.role,
    teamId: options.teamId,
  });

  // Legacy: view=my_claims
  if (options.viewParam === "my_claims" && !options.focusParam) {
    return {
      focus: "mine",
      teamScope: defaultTeam,
      showOthersClaimed: options.claimedParam === "show",
    };
  }

  // Legacy: view=mine|all|unassigned|<teamId>
  if (options.viewParam && !options.focusParam && !options.teamParam) {
    const view = options.viewParam;
    if (view === "mine") {
      return {
        focus: "needs_claim",
        teamScope: options.teamId ? "mine" : "all",
        showOthersClaimed: options.claimedParam === "show",
      };
    }
    return {
      focus: "needs_claim",
      teamScope: view,
      showOthersClaimed: options.claimedParam === "show",
    };
  }

  const focus: TrapQueueFocus =
    options.focusParam === "mine" ? "mine" : defaultTrapQueueFocus();
  const teamScope = (options.teamParam ?? defaultTeam) as TrapQueueTeamScope;

  return {
    focus,
    teamScope: teamScope === "mine" && !options.teamId ? "all" : teamScope,
    showOthersClaimed: options.claimedParam === "show",
  };
}

export function buildTrapQueueQuery(
  supabase: SupabaseClient,
  { teamScope, teamId }: TrapQueueQueryOptions
) {
  let query = supabase
    .from("help_requests")
    .select("*")
    .in("status", TRAP_QUEUE_STATUSES)
    .order("created_at", { ascending: true });

  if (teamScope === "all") return query;
  if (teamScope === "unassigned") return query.is("assigned_team_id", null);
  if (teamScope === "mine") {
    if (teamId) return query.eq("assigned_team_id", teamId);
    return query;
  }
  return query.eq("assigned_team_id", teamScope);
}

export function buildMyClaimsQuery(supabase: SupabaseClient, userEmail: string) {
  return supabase
    .from("help_requests")
    .select("*")
    .in("status", TRAP_QUEUE_STATUSES)
    .eq("claimed_by_email", userEmail)
    .order("created_at", { ascending: true });
}

const CLOSED_CASE_STATUSES = ["closed", "completed"] as const;

/** Finished cases kept off the active trap board. */
export function buildClosedCasesQuery(
  supabase: SupabaseClient,
  { teamScope, teamId, userEmail }: TrapQueueQueryOptions
) {
  let query = supabase
    .from("help_requests")
    .select("*")
    .in("status", [...CLOSED_CASE_STATUSES])
    .order("closed_at", { ascending: false, nullsFirst: false });

  if (teamScope === "all") return query;
  if (teamScope === "unassigned") return query.is("assigned_team_id", null);
  if (teamScope === "mine") {
    if (teamId) return query.eq("assigned_team_id", teamId);
    return query;
  }
  return query.eq("assigned_team_id", teamScope);
}

export function trapQueueTeamScopeLabel(
  teamScope: TrapQueueTeamScope,
  teams: { id: string; name: string }[],
  myTeamName?: string | null
): string {
  if (teamScope === "mine") {
    return myTeamName ? `My team · ${myTeamName}` : "My team";
  }
  if (teamScope === "unassigned") return "No team";
  if (teamScope === "all") return "All teams";
  return teams.find((team) => team.id === teamScope)?.name ?? "Team";
}

export function trapQueueFocusLabel(focus: TrapQueueFocus): string {
  return focus === "mine" ? "My claims" : "Needs claim";
}
