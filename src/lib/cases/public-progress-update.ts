import { normalizeHistoryLog } from "@/lib/cases/history-log";
import { CASE_STATUSES } from "@/lib/constants";
import type { HelpRequest, HelpRequestStatus, HistoryEntry } from "@/lib/types";

const VERIFY_GENERIC_ERROR =
  "We couldn’t verify that case with the details provided. Check the case number and colony ZIP or street, then try again.";

const CLOSED_CASE_ERROR =
  "This case is already closed. Contact the team if you need to share an update.";

export const PUBLIC_PROGRESS_SELECT =
  "id, case_number, status, colony_address, colony_city, colony_zip, cats_over_8_weeks, kittens_under_8_weeks, reported_cats_over_8_weeks, reported_kittens_under_8_weeks, outcome_tnvr_count, outcome_acc_count, outcome_foster_count, outcome_other_count, cats_remaining, history_log";

export type PublicProgressCaseRow = Pick<
  HelpRequest,
  | "id"
  | "case_number"
  | "status"
  | "colony_address"
  | "colony_city"
  | "colony_zip"
  | "cats_over_8_weeks"
  | "kittens_under_8_weeks"
  | "reported_cats_over_8_weeks"
  | "reported_kittens_under_8_weeks"
  | "outcome_tnvr_count"
  | "outcome_acc_count"
  | "outcome_foster_count"
  | "outcome_other_count"
  | "cats_remaining"
  | "history_log"
>;

export interface PublicOutcomeDeltas {
  tnvrAdults: number;
  tnvrKittens: number;
  acc: number;
  foster: number;
  other: number;
}

export interface PublicProgressSummary {
  caseNumber: string;
  statusLabel: string;
  colonyCity: string | null;
  remainingAdults: number;
  remainingKittens: number;
  remainingTotal: number;
  outcomeTnvr: number;
  outcomeAcc: number;
  outcomeFoster: number;
  outcomeOther: number;
}

function normalizeCaseNumber(raw: string): string {
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("CASE-")) return trimmed;
  if (/^\d+$/.test(trimmed)) {
    return `CASE-${trimmed.padStart(5, "0")}`;
  }
  return trimmed;
}

function normalizeZip(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(0, 5);
}

function normalizeStreetFragment(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
}

function parseNonNegativeInt(value: unknown, label: string): number | { error: string } {
  if (value == null || value === "") return 0;
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0) {
    return { error: `${label} must be a whole number 0 or greater.` };
  }
  if (num > 500) {
    return { error: `${label} is too large.` };
  }
  return num;
}

export function parsePublicOutcomeDeltas(
  body: Record<string, unknown>
): PublicOutcomeDeltas | { error: string } {
  const tnvrAdults = parseNonNegativeInt(body.tnvr_adults ?? body.tnvrAdults, "TNR’d cats over 8 weeks");
  if (typeof tnvrAdults === "object") return tnvrAdults;
  const tnvrKittens = parseNonNegativeInt(
    body.tnvr_kittens ?? body.tnvrKittens,
    "TNR’d kittens under 8 weeks"
  );
  if (typeof tnvrKittens === "object") return tnvrKittens;
  const acc = parseNonNegativeInt(body.acc ?? body.outcome_acc, "ACC count");
  if (typeof acc === "object") return acc;
  const foster = parseNonNegativeInt(body.foster ?? body.outcome_foster, "Foster count");
  if (typeof foster === "object") return foster;
  const other = parseNonNegativeInt(body.other ?? body.outcome_other, "Other outcome count");
  if (typeof other === "object") return other;

  if (tnvrAdults + tnvrKittens + acc + foster + other <= 0) {
    return { error: "Enter at least one cat that was TNR’d, taken to ACC, fostered, or otherwise removed." };
  }

  return { tnvrAdults, tnvrKittens, acc, foster, other };
}

export function verificationMatches(
  row: Pick<PublicProgressCaseRow, "colony_zip" | "colony_address">,
  input: { zip?: string; street?: string }
): boolean {
  const zip = normalizeZip(input.zip ?? "");
  const street = normalizeStreetFragment(input.street ?? "");

  if (!zip && street.length < 4) {
    return false;
  }

  let zipOk = true;
  if (zip) {
    const caseZip = normalizeZip(row.colony_zip ?? "");
    zipOk = Boolean(caseZip) && caseZip === zip;
  }

  let streetOk = true;
  if (street.length >= 4) {
    const address = normalizeStreetFragment(row.colony_address ?? "");
    streetOk = Boolean(address) && address.includes(street);
  }

  if (zip && street.length >= 4) {
    return zipOk && streetOk;
  }
  if (zip) return zipOk;
  return streetOk;
}

export function toPublicProgressSummary(row: PublicProgressCaseRow): PublicProgressSummary {
  const remainingAdults = Math.max(0, row.cats_over_8_weeks ?? 0);
  const remainingKittens = Math.max(0, row.kittens_under_8_weeks ?? 0);
  const statusLabel =
    CASE_STATUSES.find((entry) => entry.value === row.status)?.label ?? "In progress";

  return {
    caseNumber: row.case_number,
    statusLabel,
    colonyCity: row.colony_city?.trim() || null,
    remainingAdults,
    remainingKittens,
    remainingTotal: remainingAdults + remainingKittens,
    outcomeTnvr: Math.max(0, row.outcome_tnvr_count ?? 0),
    outcomeAcc: Math.max(0, row.outcome_acc_count ?? 0),
    outcomeFoster: Math.max(0, row.outcome_foster_count ?? 0),
    outcomeOther: Math.max(0, row.outcome_other_count ?? 0),
  };
}

export function applyPublicOutcomeDeltas(
  row: PublicProgressCaseRow,
  deltas: PublicOutcomeDeltas
):
  | {
      update: Record<string, unknown>;
      summary: PublicProgressSummary;
      historyDetails: string;
    }
  | { error: string } {
  if (row.status === "closed") {
    return { error: CLOSED_CASE_ERROR };
  }

  const tnvr = deltas.tnvrAdults + deltas.tnvrKittens;
  const totalRemoval = tnvr + deltas.acc + deltas.foster + deltas.other;
  if (totalRemoval <= 0) {
    return {
      error: "Enter at least one cat that was TNR’d, taken to ACC, fostered, or otherwise removed.",
    };
  }

  const remainingAdults = Math.max(0, row.cats_over_8_weeks ?? 0);
  const remainingKittens = Math.max(0, row.kittens_under_8_weeks ?? 0);

  let reportedAdults = Math.max(0, row.reported_cats_over_8_weeks ?? remainingAdults);
  let reportedKittens = Math.max(0, row.reported_kittens_under_8_weeks ?? remainingKittens);

  let adults = remainingAdults;
  let kittens = remainingKittens;

  // Allow reporting newly found cats: anything beyond current remaining
  // increases the originally-reported baseline so colony counts stay consistent.
  if (deltas.tnvrAdults > adults) {
    reportedAdults += deltas.tnvrAdults - adults;
    adults = 0;
  } else {
    adults -= deltas.tnvrAdults;
  }

  if (deltas.tnvrKittens > kittens) {
    reportedKittens += deltas.tnvrKittens - kittens;
    kittens = 0;
  } else {
    kittens -= deltas.tnvrKittens;
  }

  let leftover = deltas.acc + deltas.foster + deltas.other;
  const fromAdults = Math.min(adults, leftover);
  adults -= fromAdults;
  leftover -= fromAdults;
  const fromKittens = Math.min(kittens, leftover);
  kittens -= fromKittens;
  leftover -= fromKittens;
  if (leftover > 0) {
    reportedAdults += leftover;
  }

  const next: PublicProgressCaseRow = {
    ...row,
    reported_cats_over_8_weeks: reportedAdults,
    reported_kittens_under_8_weeks: reportedKittens,
    outcome_tnvr_count: Math.max(0, row.outcome_tnvr_count ?? 0) + tnvr,
    outcome_acc_count: Math.max(0, row.outcome_acc_count ?? 0) + deltas.acc,
    outcome_foster_count: Math.max(0, row.outcome_foster_count ?? 0) + deltas.foster,
    outcome_other_count: Math.max(0, row.outcome_other_count ?? 0) + deltas.other,
    cats_over_8_weeks: adults,
    kittens_under_8_weeks: kittens,
    cats_remaining: adults + kittens,
  };

  const parts: string[] = [];
  if (deltas.tnvrAdults) parts.push(`${deltas.tnvrAdults} adult TNR’d`);
  if (deltas.tnvrKittens) parts.push(`${deltas.tnvrKittens} kitten TNR’d`);
  if (deltas.acc) parts.push(`${deltas.acc} to ACC`);
  if (deltas.foster) parts.push(`${deltas.foster} to foster`);
  if (deltas.other) parts.push(`${deltas.other} other outcome`);

  const addedAdults = Math.max(0, reportedAdults - Math.max(0, row.reported_cats_over_8_weeks ?? remainingAdults));
  const addedKittens = Math.max(
    0,
    reportedKittens - Math.max(0, row.reported_kittens_under_8_weeks ?? remainingKittens)
  );
  if (addedAdults || addedKittens) {
    const addedParts: string[] = [];
    if (addedAdults) addedParts.push(`${addedAdults} adult${addedAdults === 1 ? "" : "s"}`);
    if (addedKittens) addedParts.push(`${addedKittens} kitten${addedKittens === 1 ? "" : "s"}`);
    parts.push(`added ${addedParts.join(" and ")} to originally reported`);
  }

  return {
    update: {
      reported_cats_over_8_weeks: next.reported_cats_over_8_weeks,
      reported_kittens_under_8_weeks: next.reported_kittens_under_8_weeks,
      outcome_tnvr_count: next.outcome_tnvr_count,
      outcome_acc_count: next.outcome_acc_count,
      outcome_foster_count: next.outcome_foster_count,
      outcome_other_count: next.outcome_other_count,
      cats_over_8_weeks: next.cats_over_8_weeks,
      kittens_under_8_weeks: next.kittens_under_8_weeks,
      cats_remaining: next.cats_remaining,
    },
    summary: toPublicProgressSummary(next),
    historyDetails: `Public colony update: ${parts.join(", ")}. Remaining now ${next.cats_remaining}.`,
  };
}

export function buildPublicProgressHistoryEntry(options: {
  details: string;
  actorName?: string | null;
  notes?: string | null;
}): HistoryEntry {
  const note = options.notes?.trim();
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action: "public_progress_update",
    actor_email: null,
    actor_name: options.actorName?.trim() || "Community member",
    details: note ? `${options.details} Note: ${note}` : options.details,
    highlighted: true,
  };
}

export function appendPublicProgressHistory(
  existing: unknown,
  entry: HistoryEntry
): HistoryEntry[] {
  return [...normalizeHistoryLog(existing), entry];
}

export function findCaseForPublicProgress(options: {
  caseNumber: string;
  zip?: string;
  street?: string;
  rows: PublicProgressCaseRow[];
}): { row: PublicProgressCaseRow } | { error: string; status: number } {
  const caseNumber = normalizeCaseNumber(options.caseNumber);
  if (!caseNumber) {
    return { error: "Enter a case number.", status: 400 };
  }

  const zip = (options.zip ?? "").trim();
  const street = (options.street ?? "").trim();
  if (!zip && street.length < 4) {
    return {
      error: "Enter the colony ZIP code and/or at least 4 characters of the colony street.",
      status: 400,
    };
  }

  const matches = options.rows.filter(
    (row) => normalizeCaseNumber(row.case_number) === caseNumber
  );

  if (matches.length === 0) {
    return { error: VERIFY_GENERIC_ERROR, status: 404 };
  }

  const verified = matches.find((row) =>
    verificationMatches(row, { zip, street })
  );

  if (!verified) {
    return { error: VERIFY_GENERIC_ERROR, status: 404 };
  }

  if (verified.status === ("closed" as HelpRequestStatus)) {
    return { error: CLOSED_CASE_ERROR, status: 400 };
  }

  return { row: verified };
}

/** Candidate case_number values to query for a public lookup. */
export function caseNumberLookupValues(raw: string): string[] {
  const normalized = normalizeCaseNumber(raw);
  if (!normalized) return [];
  const values = new Set<string>([normalized]);
  const digits = raw.replace(/\D/g, "");
  if (digits) {
    values.add(`CASE-${digits.padStart(5, "0")}`);
    values.add(digits);
  }
  return [...values];
}

export { normalizeCaseNumber, VERIFY_GENERIC_ERROR, CLOSED_CASE_ERROR };
