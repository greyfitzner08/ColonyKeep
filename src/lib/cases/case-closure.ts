export const CASE_CLOSE_OUTCOMES = [
  { value: "tnvr_complete", label: "TNVR Complete" },
  { value: "partial_tnvr", label: "Partial TNVR" },
  { value: "referred_elsewhere", label: "Referred Elsewhere" },
  { value: "colony_relocated", label: "Colony Relocated" },
  { value: "unable_to_assist", label: "Unable to Assist" },
  { value: "duplicate", label: "Duplicate" },
] as const;

export type CaseCloseOutcome = (typeof CASE_CLOSE_OUTCOMES)[number]["value"];

export function caseCloseOutcomeLabel(outcome: string | null | undefined): string {
  const normalized = (outcome ?? "").trim();
  if (!normalized) return "None";
  const match = CASE_CLOSE_OUTCOMES.find((entry) => entry.value === normalized);
  return match?.label ?? normalized.replace(/_/g, " ");
}

export function describeCaseCloseHistory(options: {
  outcome: string | null | undefined;
  closureNotes: string | null | undefined;
}): string {
  const outcome = (options.outcome ?? "").trim();
  const notes = (options.closureNotes ?? "").trim();
  const parts: string[] = [];

  if (outcome) {
    parts.push(`Closed with outcome: ${caseCloseOutcomeLabel(outcome)}`);
  } else {
    parts.push("Case closed");
  }

  if (notes) {
    parts.push(`Notes: ${notes}`);
  }

  return parts.join(" · ");
}
