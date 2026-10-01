const OPEN_CLAIM_STATUSES = new Set(["new_intake", "under_review"]);

export interface ImportedClaimProfile {
  email: string;
  full_name: string | null;
}

function normalizePerson(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Attach an imported assignee to a real user, or mark the case for review. */
export function applyImportedClaimant(
  record: Record<string, unknown>,
  profiles: ImportedClaimProfile[]
): Record<string, unknown> {
  const raw = typeof record.claimed_by_name === "string" ? record.claimed_by_name.trim() : "";
  if (!raw) {
    return { ...record, claimant_needs_review: false };
  }

  const key = normalizePerson(raw);
  const byEmail = raw.includes("@")
    ? profiles.find((person) => person.email && normalizePerson(person.email) === key)
    : undefined;
  const byName = profiles.filter(
    (person) => person.full_name && normalizePerson(person.full_name) === key
  );
  const match = byEmail ?? (byName.length === 1 ? byName[0] : undefined);

  if (!match?.email) {
    return { ...record, claimed_by_name: raw, claimant_needs_review: true };
  }

  const status = typeof record.status === "string" ? record.status : "";
  return {
    ...record,
    claimed_by_email: match.email.trim().toLowerCase(),
    claimed_by_name: match.full_name?.trim() || raw,
    claimant_needs_review: false,
    status: OPEN_CLAIM_STATUSES.has(status) ? "claimed" : record.status,
  };
}
