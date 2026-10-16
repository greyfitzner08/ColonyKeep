/**
 * Cases closed as duplicates should not contribute cats (or linked clinic work)
 * to org reporting — the keeper case already holds the real count.
 */
export function isDuplicateClosedCase(hr: {
  status?: string | null;
  outcome?: string | null;
}): boolean {
  if (hr.status !== "closed") return false;
  return closedOutcome(hr) === "duplicate";
}

/**
 * Closed outcomes where intake “cats reported” should not inflate org reports.
 * Partial TNVR and referred-elsewhere cases are no longer active caseload;
 * duplicates are already dropped from most report sets but also return 0 here.
 */
export function omitsReportedCatsFromReports(hr: {
  status?: string | null;
  outcome?: string | null;
}): boolean {
  if (hr.status !== "closed") return false;
  const outcome = closedOutcome(hr);
  return (
    outcome === "partial_tnvr" ||
    outcome === "referred_elsewhere" ||
    outcome === "duplicate"
  );
}

function closedOutcome(hr: { outcome?: string | null }): string {
  return (hr.outcome ?? "").trim().toLowerCase();
}
