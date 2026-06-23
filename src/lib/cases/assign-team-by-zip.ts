export interface TrapTeamZipMatch {
  id: string;
  name: string;
  zip_codes: string[];
  is_active?: boolean;
}

export function normalizeZip(zip: string | null | undefined): string {
  if (!zip) return "";
  return zip.replace(/\D/g, "").slice(0, 5);
}

export function findTrapTeamForZip(
  zip: string | null | undefined,
  teams: TrapTeamZipMatch[]
): { id: string; name: string } | null {
  const normalized = normalizeZip(zip);
  if (!normalized) return null;

  for (const team of teams) {
    if (team.is_active === false) continue;
    if (team.zip_codes.some((entry) => normalizeZip(entry) === normalized)) {
      return { id: team.id, name: team.name };
    }
  }

  return null;
}

export function applyTrapTeamAssignment<T extends Record<string, unknown>>(
  record: T,
  zip: string | null | undefined,
  teams: TrapTeamZipMatch[]
): T & {
  assigned_team_id?: string;
  assigned_team_name?: string;
  assigned_team?: string;
} {
  const match = findTrapTeamForZip(zip, teams);
  if (!match) return record;

  return {
    ...record,
    assigned_team_id: match.id,
    assigned_team_name: match.name,
    assigned_team: match.name,
  };
}
