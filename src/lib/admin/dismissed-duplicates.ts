export type DismissedDuplicateEntityType = "profile" | "application";

/** Stable pair key matching find-duplicate scanners (`sortedIdA:sortedIdB`). */
export function duplicatePairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/** All pairwise keys for a cluster of IDs (used when dismissing a whole group). */
export function duplicatePairKeysForIds(ids: string[]): string[] {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  const keys: string[] = [];
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      keys.push(duplicatePairKey(unique[i]!, unique[j]!));
    }
  }
  return keys;
}

export function parseDuplicatePairKey(key: string): { leftId: string; rightId: string } | null {
  const [leftId, rightId] = key.split(":");
  if (!leftId || !rightId || leftId === rightId) return null;
  const [orderedLeft, orderedRight] = [leftId, rightId].sort();
  return { leftId: orderedLeft!, rightId: orderedRight! };
}

export function rowsToDismissedPairKeySet(
  rows: Array<{ left_id: string; right_id: string }> | null | undefined
): Set<string> {
  const keys = new Set<string>();
  for (const row of rows ?? []) {
    if (!row.left_id || !row.right_id) continue;
    keys.add(duplicatePairKey(row.left_id, row.right_id));
  }
  return keys;
}
