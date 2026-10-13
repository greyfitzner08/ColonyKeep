/**
 * Cases closed as duplicates should not contribute cats (or linked clinic work)
 * to org reporting — the keeper case already holds the real count.
 */
export function isDuplicateClosedCase(hr: {
  status?: string | null;
  outcome?: string | null;
}): boolean {
  if (hr.status !== "closed") return false;
  return (hr.outcome ?? "").trim().toLowerCase() === "duplicate";
}
