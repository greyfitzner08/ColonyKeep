import { detectMedicalKeywords } from "@/lib/medical-flags";
import type { HelpRequestStatus } from "@/lib/types";

export const CASE_IMPORT_HEADERS = [
  "Case Number",
  "Timestamp",
  "First Name",
  "Last Name",
  "Street Address",
  "City",
  "State",
  "Zip Code",
  "County",
  "Phone Number",
  "Email",
  "Your relationship to the cats",
  "Colony Street Address (no City/State/Zip)",
  "Colony City",
  "Colony State",
  "Colony Zip Code",
  "Colony County",
  "Total Number of Cats (OVER 8 weeks/2 months)",
  "Total Number of Kittens (UNDER 8 weeks/ 2 months)",
  "Number you suspect are pregnant",
  "Are you feeding the cats?",
  "If you are not feeding, please indicate who is.",
  "Do you have trapping experience?",
  "Do you need to borrow traps?",
  "Are you willing to trap and transport?",
  "Are you able to trap and transport?",
  "Do you have a place to hold the cats before and after surgery?",
  "Anything else you would like us to know about this colony?",
  "How did you hear about us?",
  "I agree to receive occasional communications from Friends of Feral Felines.",
  "If this is an apartment community, please provide the name",
  "Email Address",
  "Assigned To",
  "Outcome",
  "Resolution",
  "Case Status",
  "Date Closed",
  "Priority",
  "Trapper/Trap Loaner",
  "Additional Notes",
  "Number of Cats TNVR'd",
  "Number Taken to ACC",
  "Number Taken into Foster",
  "Number Other Outcome",
  "# of Cats/Kittens Remaining",
] as const;

const HEADER_ALIASES: Record<string, string> = {
  case_number: "case_number",
  timestamp: "timestamp",
  first_name: "first_name",
  last_name: "last_name",
  street_address: "street_address",
  city: "city",
  state: "state",
  zip_code: "zip_code",
  county: "county",
  phone_number: "phone_number",
  email: "email",
  email_address: "email",
  your_relationship_to_the_cats: "relationship_to_cats",
  colony_street_address_no_city_state_zip: "colony_street_address",
  colony_city: "colony_city",
  colony_state: "colony_state",
  colony_zip_code: "colony_zip_code",
  colony_county: "colony_county",
  total_number_of_cats_over_8_weeks_2_months: "cats_over_8_weeks",
  total_number_of_kittens_under_8_weeks_2_months: "kittens_under_8_weeks",
  number_you_suspect_are_pregnant: "pregnant_count",
  are_you_feeding_the_cats: "feeding_cats",
  if_you_are_not_feeding_please_indicate_who_is: "feeder_if_not",
  do_you_have_trapping_experience: "trapping_experience",
  do_you_need_to_borrow_traps: "need_traps",
  are_you_willing_to_trap_and_transport: "willing_to_trap_transport",
  are_you_able_to_trap_and_transport: "able_to_trap_transport",
  do_you_have_a_place_to_hold_the_cats_before_and_after_surgery: "has_recovery_space",
  anything_else_you_would_like_us_to_know_about_this_colony: "colony_notes",
  how_did_you_hear_about_us: "how_heard",
  i_agree_to_receive_occasional_communications_from_friends_of_feral_felines:
    "consent_communications",
  if_this_is_an_apartment_community_please_provide_the_name: "apartment_name",
  assigned_to: "assigned_to",
  outcome: "outcome",
  resolution: "resolution",
  case_status: "case_status",
  date_closed: "date_closed",
  priority: "priority",
  trapper_trap_loaner: "trapper_trap_loaner",
  additional_notes: "additional_notes",
  number_of_cats_tnvr_d: "outcome_tnvr_count",
  number_taken_to_acc: "outcome_acc_count",
  number_taken_into_foster: "outcome_foster_count",
  number_other_outcome: "outcome_other_count",
  number_of_cats_kittens_remaining: "cats_remaining",
  contact_name: "contact_name",
  contact_email: "email",
  contact_phone: "phone_number",
  colony_address: "colony_street_address",
  colony_zip: "colony_zip_code",
  intake_notes: "colony_notes",
  status: "case_status",
};

const VALID_STATUSES = new Set<HelpRequestStatus>([
  "new_intake",
  "under_review",
  "needs_more_info",
  "routed_to_trap_team",
  "claimed",
  "appointment_needed",
  "appointment_reserved",
  "cat_trapped",
  "transported",
  "checked_in",
  "completed",
  "closed",
]);

const LEGACY_STATUS_MAP: Record<string, HelpRequestStatus> = {
  open: "new_intake",
  new: "new_intake",
  pending: "new_intake",
  intake: "new_intake",
  "in progress": "under_review",
  active: "under_review",
  review: "under_review",
  "under review": "under_review",
  "needs follow up": "needs_more_info",
  "needs follow-up": "needs_more_info",
  routed: "routed_to_trap_team",
  trapping: "claimed",
  trapped: "cat_trapped",
  transported: "transported",
  complete: "completed",
  completed: "completed",
  closed: "closed",
  resolved: "closed",
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/#/g, "number")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function scoreImportHeaderRow(cells: string[]): number {
  let score = 0;
  for (const cell of cells) {
    if (HEADER_ALIASES[normalizeHeader(cell)]) {
      score += 1;
    }
  }
  return score;
}

export function findImportHeaderRowIndex(records: string[][]): number {
  let bestIndex = 0;
  let bestScore = 0;
  const scanLimit = Math.min(records.length, 10);

  for (let index = 0; index < scanLimit; index += 1) {
    const score = scoreImportHeaderRow(records[index] ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore >= 3 ? bestIndex : 0;
}

function looksMisalignedCaseNumber(value: string | undefined): boolean {
  if (!value) return false;
  return value.includes(",") || value.length > 80;
}

export function normalizeImportRow(raw: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [header, value] of Object.entries(raw)) {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    if (!key) continue;
    const text = String(value ?? "").trim();
    if (!text) continue;
    if (!normalized[key] || key === "email") {
      normalized[key] = text;
    }
  }

  return normalized;
}

function parseInteger(value: string | undefined, fallback = 0) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(normalized)) return true;
  if (["no", "n", "false", "0"].includes(normalized)) return false;
  return null;
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function mapPriority(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "normal";
  if (["high", "urgent", "emergency"].includes(normalized)) return "high";
  if (["low"].includes(normalized)) return "low";
  return normalized;
}

function mapStatus(value: string | undefined): HelpRequestStatus {
  if (!value) return "new_intake";
  const normalized = value.trim().toLowerCase();
  if (VALID_STATUSES.has(normalized as HelpRequestStatus)) {
    return normalized as HelpRequestStatus;
  }
  return LEGACY_STATUS_MAP[normalized] ?? "new_intake";
}

function buildContactName(row: Record<string, string>) {
  if (row.contact_name) return row.contact_name;
  const parts = [row.first_name, row.last_name].filter(Boolean);
  return parts.join(" ").trim() || "Unknown Contact";
}

function buildIntakeNotes(row: Record<string, string>) {
  const sections: string[] = [];

  if (row.colony_notes) sections.push(row.colony_notes);
  if (row.additional_notes) sections.push(`Additional notes: ${row.additional_notes}`);
  if (row.relationship_to_cats) sections.push(`Relationship to cats: ${row.relationship_to_cats}`);
  if (row.trapping_experience) sections.push(`Trapping experience: ${row.trapping_experience}`);
  if (row.feeder_if_not) sections.push(`Feeder if not reporter: ${row.feeder_if_not}`);
  if (row.apartment_name) sections.push(`Apartment/community: ${row.apartment_name}`);
  if (row.trapper_trap_loaner) sections.push(`Trapper/trap loaner: ${row.trapper_trap_loaner}`);
  if (row.resolution) sections.push(`Resolution: ${row.resolution}`);

  return sections.join("\n\n").trim() || null;
}

export function mapImportRowToHelpRequest(
  raw: Record<string, unknown>,
  actorEmail: string
): { error?: string; record?: Record<string, unknown> } {
  const row = normalizeImportRow(raw);
  const contactName = buildContactName(row);
  const contactEmail = (row.email ?? "").toLowerCase();
  const contactPhone = row.phone_number ?? "Unknown";
  const colonyAddress = row.colony_street_address ?? row.street_address ?? "Unknown";
  const colonyCity = row.colony_city ?? row.city ?? "Unknown";
  const colonyCounty = row.colony_county ?? row.county ?? "Unknown";
  const colonyZip = row.colony_zip_code ?? row.zip_code ?? "00000";
  const intakeNotes = buildIntakeNotes(row);
  const feedingCats = parseBoolean(row.feeding_cats);
  const needTraps = parseBoolean(row.need_traps);
  const hasRecoverySpace = parseBoolean(row.has_recovery_space);
  const consent = parseBoolean(row.consent_communications);
  const willing = row.willing_to_trap_transport?.toLowerCase() ?? "";
  const able = row.able_to_trap_transport?.toLowerCase() ?? "";
  const canTransport =
    ["yes", "y", "true"].includes(able) || ["yes", "y", "true"].includes(willing);
  const canHelp =
    canTransport || ["yes", "y", "true"].includes(row.trapping_experience?.toLowerCase() ?? "");

  if (!contactEmail && !row.phone_number && !row.case_number) {
    return {
      error: "Each row needs at least a Case Number, Email, or Phone Number.",
    };
  }

  if (looksMisalignedCaseNumber(row.case_number)) {
    return {
      error:
        "Case Number column looks misaligned. Check that the CSV uses quoted fields for notes and matches the export header row.",
    };
  }

  const status = mapStatus(row.case_status);
  const createdAt = parseDate(row.timestamp);
  const closedAt = parseDate(row.date_closed);

  const record: Record<string, unknown> = {
    case_number: row.case_number || null,
    status,
    contact_name: contactName,
    contact_first_name: row.first_name ?? null,
    contact_last_name: row.last_name ?? null,
    contact_email: contactEmail || `import-${row.case_number || contactName.replace(/\s+/g, "-").toLowerCase()}@unknown.local`,
    contact_phone: contactPhone,
    contact_street: row.street_address ?? null,
    contact_city: row.city ?? null,
    contact_state: row.state ?? null,
    contact_zip: row.zip_code ?? null,
    contact_county: row.county ?? null,
    colony_address: colonyAddress,
    colony_city: colonyCity,
    colony_state: row.colony_state ?? row.state ?? null,
    colony_county: colonyCounty,
    colony_zip: colonyZip,
    kittens_under_8_weeks: parseInteger(row.kittens_under_8_weeks),
    cats_over_8_weeks: parseInteger(row.cats_over_8_weeks),
    pregnant_count: parseInteger(row.pregnant_count),
    feeding_cats: feedingCats,
    feeder_if_not: row.feeder_if_not ?? null,
    trapping_experience: row.trapping_experience ?? null,
    need_traps: needTraps,
    willing_to_trap_transport: row.willing_to_trap_transport ?? null,
    able_to_trap_transport: row.able_to_trap_transport ?? null,
    has_recovery_space: hasRecoverySpace ?? false,
    can_help: canHelp,
    has_traps: needTraps ?? false,
    can_transport: canTransport,
    consent_communications: consent ?? false,
    relationship_to_cats: row.relationship_to_cats ?? null,
    how_heard: row.how_heard ?? null,
    apartment_name: row.apartment_name ?? null,
    assigned_to: row.assigned_to ?? null,
    claimed_by_name: row.assigned_to ?? null,
    outcome: row.outcome ?? null,
    resolution: row.resolution ?? null,
    closure_notes: row.resolution ?? null,
    priority: mapPriority(row.priority),
    trapper_trap_loaner: row.trapper_trap_loaner ?? null,
    additional_notes: row.additional_notes ?? null,
    outcome_tnvr_count: parseInteger(row.outcome_tnvr_count),
    outcome_acc_count: parseInteger(row.outcome_acc_count),
    outcome_foster_count: parseInteger(row.outcome_foster_count),
    outcome_other_count: parseInteger(row.outcome_other_count),
    cats_remaining: parseInteger(row.cats_remaining),
    intake_notes: intakeNotes,
    colony_details_notes: intakeNotes,
    internal_notes: row.additional_notes ?? null,
    can_help_trapping: canHelp,
    has_traps_available: needTraps ?? false,
    can_transport_cats: canTransport,
    consent_to_communications: consent ?? false,
    assigned_team: row.trapper_trap_loaner ?? null,
    medical_flags: detectMedicalKeywords(intakeNotes ?? ""),
    closed_at: closedAt,
    history_log: [
      {
        timestamp: new Date().toISOString(),
        action: "imported",
        actor_email: actorEmail,
        actor_name: actorEmail,
        details: row.case_number
          ? `Imported legacy case ${row.case_number}`
          : "Imported from CSV",
      },
    ],
  };

  if (createdAt) {
    record.created_at = createdAt;
  }

  return { record };
}

export function buildCaseImportTemplateCsv() {
  return `${CASE_IMPORT_HEADERS.join(",")}\n`;
}
