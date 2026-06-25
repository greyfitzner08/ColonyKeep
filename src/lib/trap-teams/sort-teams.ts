/** Natural sort for trap team names (Team 1, Team 2, … Team 10). */
export function compareTrapTeamNames(left: string, right: string): number {
  const leftNumber = parseTrapTeamNumber(left);
  const rightNumber = parseTrapTeamNumber(right);

  if (leftNumber != null && rightNumber != null) {
    return leftNumber - rightNumber;
  }
  if (leftNumber != null) return -1;
  if (rightNumber != null) return 1;

  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

export function sortTrapTeams<T extends { name: string }>(teams: readonly T[]): T[] {
  return [...teams].sort((left, right) => compareTrapTeamNames(left.name, right.name));
}

function parseTrapTeamNumber(name: string): number | null {
  const match = name.trim().match(/^team\s*(\d+)\s*$/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}
