import {
  findTrapTeamForZip,
  type TrapTeamZipMatch,
} from "@/lib/cases/assign-team-by-zip";

export const TRAP_SCHOOL_TEAM_NAME = "Trap School";

/** Colonies at or below this total (cats + kittens) are Trap School–eligible. */
export const TRAP_SCHOOL_MAX_REPORTED_CATS = 5;

export function normalizeTeamName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

export function isTrapSchoolTeamName(name: string | null | undefined): boolean {
  return normalizeTeamName(name) === normalizeTeamName(TRAP_SCHOOL_TEAM_NAME);
}

export function findTrapSchoolTeam(
  teams: TrapTeamZipMatch[]
): { id: string; name: string } | null {
  const match = teams.find(
    (team) => team.is_active !== false && isTrapSchoolTeamName(team.name)
  );
  if (!match) return null;
  return { id: match.id, name: match.name };
}

export function reportedCatTotal(
  catsOver8Weeks: number | null | undefined,
  kittensUnder8Weeks: number | null | undefined
): number {
  return Math.max(0, Number(catsOver8Weeks) || 0) + Math.max(0, Number(kittensUnder8Weeks) || 0);
}

export function isTrapSchoolEligible(
  catsOver8Weeks: number | null | undefined,
  kittensUnder8Weeks: number | null | undefined
): boolean {
  return reportedCatTotal(catsOver8Weeks, kittensUnder8Weeks) <= TRAP_SCHOOL_MAX_REPORTED_CATS;
}

/** Geographic teams only — Trap School is a case flag, not an assignment target. */
export function geographicTrapTeams(teams: TrapTeamZipMatch[]): TrapTeamZipMatch[] {
  return teams.filter((team) => !isTrapSchoolTeamName(team.name));
}

/**
 * Assign a new/imported case to a trap team by colony ZIP.
 * Trap School eligibility is a separate flag when reported cats + kittens ≤ 5.
 */
export function resolveCaseTrapTeamAssignment(options: {
  colonyZip: string | null | undefined;
  catsOver8Weeks?: number | null;
  kittensUnder8Weeks?: number | null;
  teams: TrapTeamZipMatch[];
}): {
  id: string;
  name: string;
  reason: "zip";
  trap_school_eligible: boolean;
} | null {
  const trap_school_eligible = isTrapSchoolEligible(
    options.catsOver8Weeks,
    options.kittensUnder8Weeks
  );
  const zipMatch = findTrapTeamForZip(options.colonyZip, geographicTrapTeams(options.teams));
  if (!zipMatch) return null;
  return { ...zipMatch, reason: "zip", trap_school_eligible };
}

export function applyCaseTrapTeamAssignment<T extends Record<string, unknown>>(
  record: T,
  teams: TrapTeamZipMatch[],
  options?: {
    colonyZip?: string | null;
    catsOver8Weeks?: number | null;
    kittensUnder8Weeks?: number | null;
  }
): T & {
  assigned_team_id?: string;
  assigned_team_name?: string;
  assigned_team?: string;
  trap_school_eligible?: boolean;
} {
  const colonyZip =
    options?.colonyZip ??
    (typeof record.colony_zip === "string" ? record.colony_zip : null);
  const catsOver8Weeks =
    options?.catsOver8Weeks ??
    (typeof record.cats_over_8_weeks === "number" ? record.cats_over_8_weeks : null);
  const kittensUnder8Weeks =
    options?.kittensUnder8Weeks ??
    (typeof record.kittens_under_8_weeks === "number"
      ? record.kittens_under_8_weeks
      : null);

  const trap_school_eligible = isTrapSchoolEligible(catsOver8Weeks, kittensUnder8Weeks);
  const match = resolveCaseTrapTeamAssignment({
    colonyZip,
    catsOver8Weeks,
    kittensUnder8Weeks,
    teams,
  });

  if (!match) {
    return {
      ...record,
      trap_school_eligible,
    };
  }

  return {
    ...record,
    assigned_team_id: match.id,
    assigned_team_name: match.name,
    assigned_team: match.name,
    trap_school_eligible,
  };
}
