import type { SupabaseClient } from "@supabase/supabase-js";
import { summarizeCatCounts, type CatCountSummary } from "@/lib/cases/cat-counts";
import { normalizeHistoryLog } from "@/lib/cases/history-log";
import { CASE_STATUSES } from "@/lib/constants";
import type { HelpRequest, HelpRequestStatus, HistoryEntry } from "@/lib/types";

const VERIFY_GENERIC_ERROR =
  "We couldn’t verify that case with the details provided. Check the case number and colony ZIP or street, then try again.";

const FIND_GENERIC_ERROR =
  "We couldn’t find a case with that name and colony ZIP. Check the spelling and ZIP, or use your case number if you have it.";

const FIND_AMBIGUOUS_ERROR =
  "More than one case matches that name and ZIP. Enter your case number, or include part of the colony street on the main form.";

const CLOSED_CASE_ERROR =
  "This case is already closed. Contact the team if you need to share an update.";

export const PUBLIC_PROGRESS_SELECT =
  "id, case_number, status, colony_address, colony_city, colony_zip, cats_over_8_weeks, kittens_under_8_weeks, reported_cats_over_8_weeks, reported_kittens_under_8_weeks, outcome_tnvr_count, outcome_acc_count, outcome_foster_count, outcome_other_count, cats_remaining, history_log";

export const PUBLIC_PROGRESS_FIND_SELECT = `${PUBLIC_PROGRESS_SELECT}, contact_name, contact_first_name, contact_last_name, contact_zip`;

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

export type PublicProgressFindCaseRow = PublicProgressCaseRow &
  Pick<HelpRequest, "contact_name" | "contact_first_name" | "contact_last_name" | "contact_zip">;

export interface PublicOutcomeDeltas {
  tnvrAdults: number;
  tnvrKittens: number;
  acc: number;
  foster: number;
  other: number;
  additionalAdults: number;
  additionalKittens: number;
}

export interface PublicProgressSummary {
  caseNumber: string;
  statusLabel: string;
  colonyCity: string | null;
  remainingAdults: number;
  remainingKittens: number;
  remainingTotal: number;
  reportedAdults: number;
  reportedKittens: number;
  outcomeTnvr: number;
  outcomeAcc: number;
  outcomeFoster: number;
  outcomeOther: number;
  /** Same colony cat-count table used on Case → Colony. */
  counts: CatCountSummary;
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

function normalizePersonName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ");
}

function zipMatches(stored: string | null | undefined, inputZip: string): boolean {
  const expected = normalizeZip(inputZip);
  if (!expected) return false;
  const actual = normalizeZip(stored ?? "");
  return Boolean(actual) && actual === expected;
}

function reporterNameMatches(
  row: Pick<
    PublicProgressFindCaseRow,
    "contact_name" | "contact_first_name" | "contact_last_name"
  >,
  firstName: string,
  lastName: string
): boolean {
  const first = normalizePersonName(firstName);
  const last = normalizePersonName(lastName);
  if (!first || !last) return false;

  const rowFirst = normalizePersonName(row.contact_first_name ?? "");
  const rowLast = normalizePersonName(row.contact_last_name ?? "");
  if (rowFirst && rowLast && rowFirst === first && rowLast === last) {
    return true;
  }

  const full = normalizePersonName(row.contact_name ?? "");
  if (!full) return false;
  return full === `${first} ${last}` || (full.includes(first) && full.includes(last));
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
  const other = parseNonNegativeInt(body.other ?? body.outcome_other, "No longer need TNR count");
  if (typeof other === "object") return other;
  const additionalAdults = parseNonNegativeInt(
    body.additional_adults ?? body.additionalAdults,
    "Additional cats over 8 weeks"
  );
  if (typeof additionalAdults === "object") return additionalAdults;
  const additionalKittens = parseNonNegativeInt(
    body.additional_kittens ?? body.additionalKittens,
    "Additional kittens under 8 weeks"
  );
  if (typeof additionalKittens === "object") return additionalKittens;

  if (
    tnvrAdults + tnvrKittens + acc + foster + other + additionalAdults + additionalKittens <=
    0
  ) {
    return {
      error:
        "Enter at least one cat that was TNR’d, removed, or found and still needs TNR.",
    };
  }

  return { tnvrAdults, tnvrKittens, acc, foster, other, additionalAdults, additionalKittens };
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

type PublicCountFix = {
  age_category: string | null;
  went_to_foster_facility: boolean | null;
  cat_id: string | null;
};

type PublicCountCat = {
  id: string;
  age_category: string | null;
  went_to_foster_facility: boolean | null;
};

export function toPublicProgressSummary(
  row: PublicProgressCaseRow,
  fixes: PublicCountFix[] = [],
  cats: PublicCountCat[] = []
): PublicProgressSummary {
  const remainingAdults = Math.max(0, row.cats_over_8_weeks ?? 0);
  const remainingKittens = Math.max(0, row.kittens_under_8_weeks ?? 0);
  const statusLabel =
    CASE_STATUSES.find((entry) => entry.value === row.status)?.label ?? "In progress";
  const counts = summarizeCatCounts(row, fixes, cats);

  return {
    caseNumber: row.case_number,
    statusLabel,
    colonyCity: row.colony_city?.trim() || null,
    remainingAdults,
    remainingKittens,
    remainingTotal: remainingAdults + remainingKittens,
    reportedAdults: counts.reportedAdults,
    reportedKittens: counts.reportedKittens,
    outcomeTnvr: Math.max(0, row.outcome_tnvr_count ?? 0),
    outcomeAcc: Math.max(0, row.outcome_acc_count ?? 0),
    outcomeFoster: Math.max(0, row.outcome_foster_count ?? 0),
    outcomeOther: Math.max(0, row.outcome_other_count ?? 0),
    counts,
  };
}

/** Load clinic/tracked-cat inputs so public summary matches Case → Colony. */
export async function toPublicProgressSummaryWithCounts(
  service: SupabaseClient,
  row: PublicProgressCaseRow
): Promise<PublicProgressSummary> {
  const [{ data: fixes }, { data: cats }] = await Promise.all([
    service
      .from("clinic_fixes")
      .select("age_category, went_to_foster_facility, cat_id")
      .eq("help_request_id", row.id),
    service
      .from("cats")
      .select("id, age_category, went_to_foster_facility")
      .eq("help_request_id", row.id),
  ]);

  return toPublicProgressSummary(
    row,
    (fixes ?? []) as PublicCountFix[],
    (cats ?? []) as PublicCountCat[]
  );
}

function takeFromRemaining(
  adults: number,
  kittens: number,
  amount: number
): { adults: number; kittens: number; applied: number; leftover: number } {
  let nextAdults = adults;
  let nextKittens = kittens;
  let remaining = Math.max(0, amount);
  const fromAdults = Math.min(nextAdults, remaining);
  nextAdults -= fromAdults;
  remaining -= fromAdults;
  const fromKittens = Math.min(nextKittens, remaining);
  nextKittens -= fromKittens;
  remaining -= fromKittens;
  return {
    adults: nextAdults,
    kittens: nextKittens,
    applied: amount - remaining,
    leftover: remaining,
  };
}

export function previewPublicOutcomeDeltas(
  summary: Pick<
    PublicProgressSummary,
    | "remainingAdults"
    | "remainingKittens"
    | "reportedAdults"
    | "reportedKittens"
    | "outcomeTnvr"
    | "outcomeAcc"
    | "outcomeFoster"
    | "outcomeOther"
  >,
  deltas: PublicOutcomeDeltas
) {
  return applyPublicOutcomeDeltas(
    {
      id: "preview",
      case_number: "preview",
      status: "claimed",
      colony_address: "",
      colony_city: "",
      colony_zip: "",
      cats_over_8_weeks: summary.remainingAdults,
      kittens_under_8_weeks: summary.remainingKittens,
      reported_cats_over_8_weeks: summary.reportedAdults,
      reported_kittens_under_8_weeks: summary.reportedKittens,
      outcome_tnvr_count: summary.outcomeTnvr,
      outcome_acc_count: summary.outcomeAcc,
      outcome_foster_count: summary.outcomeFoster,
      outcome_other_count: summary.outcomeOther,
      cats_remaining: summary.remainingAdults + summary.remainingKittens,
      history_log: [],
    } as PublicProgressCaseRow,
    deltas
  );
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
  const additional = deltas.additionalAdults + deltas.additionalKittens;
  const totalRemoval = tnvr + deltas.acc + deltas.foster + deltas.other;
  if (totalRemoval + additional <= 0) {
    return {
      error: "Enter at least one cat that was TNR’d, removed, or found and still needs TNR.",
    };
  }

  const remainingAdults = Math.max(0, row.cats_over_8_weeks ?? 0);
  const remainingKittens = Math.max(0, row.kittens_under_8_weeks ?? 0);

  let reportedAdults = Math.max(0, row.reported_cats_over_8_weeks ?? remainingAdults);
  let reportedKittens = Math.max(0, row.reported_kittens_under_8_weeks ?? remainingKittens);

  let adults = remainingAdults + deltas.additionalAdults;
  let kittens = remainingKittens + deltas.additionalKittens;
  reportedAdults += deltas.additionalAdults;
  reportedKittens += deltas.additionalKittens;

  // TNR beyond the current remaining of that age is a newly found cat that was TNR’d.
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

  const accTaken = takeFromRemaining(adults, kittens, deltas.acc);
  adults = accTaken.adults;
  kittens = accTaken.kittens;
  const fosterTaken = takeFromRemaining(adults, kittens, deltas.foster);
  adults = fosterTaken.adults;
  kittens = fosterTaken.kittens;
  const otherTaken = takeFromRemaining(adults, kittens, deltas.other);
  adults = otherTaken.adults;
  kittens = otherTaken.kittens;

  // Overflow ACC/foster/other is extra cats still needing TNR, not a completed outcome.
  const extraUnfixed = accTaken.leftover + fosterTaken.leftover + otherTaken.leftover;
  if (extraUnfixed > 0) {
    reportedAdults += extraUnfixed;
    adults += extraUnfixed;
  }

  const next: PublicProgressCaseRow = {
    ...row,
    reported_cats_over_8_weeks: reportedAdults,
    reported_kittens_under_8_weeks: reportedKittens,
    outcome_tnvr_count: Math.max(0, row.outcome_tnvr_count ?? 0) + tnvr,
    outcome_acc_count: Math.max(0, row.outcome_acc_count ?? 0) + accTaken.applied,
    outcome_foster_count: Math.max(0, row.outcome_foster_count ?? 0) + fosterTaken.applied,
    outcome_other_count: Math.max(0, row.outcome_other_count ?? 0) + otherTaken.applied,
    cats_over_8_weeks: adults,
    kittens_under_8_weeks: kittens,
    cats_remaining: adults + kittens,
  };

  const parts: string[] = [];
  if (deltas.tnvrAdults) parts.push(`${deltas.tnvrAdults} adult TNR’d`);
  if (deltas.tnvrKittens) parts.push(`${deltas.tnvrKittens} kitten TNR’d`);
  if (accTaken.applied) parts.push(`${accTaken.applied} to ACC`);
  if (fosterTaken.applied) parts.push(`${fosterTaken.applied} to foster`);
  if (otherTaken.applied) parts.push(`${otherTaken.applied} no longer need TNR`);
  if (deltas.additionalAdults || deltas.additionalKittens || extraUnfixed) {
    const foundAdults = deltas.additionalAdults + extraUnfixed;
    const foundParts: string[] = [];
    if (foundAdults) foundParts.push(`${foundAdults} adult${foundAdults === 1 ? "" : "s"}`);
    if (deltas.additionalKittens) {
      foundParts.push(
        `${deltas.additionalKittens} kitten${deltas.additionalKittens === 1 ? "" : "s"}`
      );
    }
    parts.push(`found ${foundParts.join(" and ")} still needing TNR`);
  }

  const tnvrExtraAdults = Math.max(0, deltas.tnvrAdults - (remainingAdults + deltas.additionalAdults));
  const tnvrExtraKittens = Math.max(
    0,
    deltas.tnvrKittens - (remainingKittens + deltas.additionalKittens)
  );
  if (tnvrExtraAdults || tnvrExtraKittens) {
    const addedParts: string[] = [];
    if (tnvrExtraAdults) {
      addedParts.push(`${tnvrExtraAdults} TNR’d adult${tnvrExtraAdults === 1 ? "" : "s"}`);
    }
    if (tnvrExtraKittens) {
      addedParts.push(`${tnvrExtraKittens} TNR’d kitten${tnvrExtraKittens === 1 ? "" : "s"}`);
    }
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
      trap_school_eligible:
        Math.max(0, next.cats_over_8_weeks ?? 0) + Math.max(0, next.kittens_under_8_weeks ?? 0) <= 5,
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

/**
 * Find an open case when the reporter forgot the case number.
 * Requires first name + last name + colony ZIP; returns at most one match.
 */
export function findCaseByReporterNameAndZip(options: {
  firstName: string;
  lastName: string;
  zip: string;
  rows: PublicProgressFindCaseRow[];
}): { row: PublicProgressCaseRow } | { error: string; status: number } {
  const firstName = options.firstName.trim();
  const lastName = options.lastName.trim();
  const zip = normalizeZip(options.zip);

  if (!firstName || !lastName || !zip) {
    return {
      error: "Enter your first name, last name, and colony ZIP code.",
      status: 400,
    };
  }

  const matches = options.rows.filter(
    (row) =>
      (zipMatches(row.colony_zip, zip) || zipMatches(row.contact_zip, zip)) &&
      reporterNameMatches(row, firstName, lastName)
  );

  if (matches.length === 0) {
    return { error: FIND_GENERIC_ERROR, status: 404 };
  }

  const openMatches = matches.filter((row) => row.status !== ("closed" as HelpRequestStatus));
  if (openMatches.length === 0) {
    return { error: CLOSED_CASE_ERROR, status: 400 };
  }

  if (openMatches.length > 1) {
    return { error: FIND_AMBIGUOUS_ERROR, status: 409 };
  }

  return { row: openMatches[0] };
}

export {
  normalizeCaseNumber,
  normalizeZip,
  VERIFY_GENERIC_ERROR,
  FIND_GENERIC_ERROR,
  FIND_AMBIGUOUS_ERROR,
  CLOSED_CASE_ERROR,
};
