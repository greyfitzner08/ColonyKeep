import { detectMedicalKeywords } from "@/lib/medical-flags";
import { mapImportRowToHelpRequest } from "@/lib/cases/import-mapper";
import { applyReporterAsFeederIfNeeded } from "@/lib/cases/feeder-from-reporter";

export {
  applyReporterAsFeederIfNeeded,
  buildFeederFieldsFromIntake,
  reporterIsColonyFeeder,
  type IntakeFeederFields,
  type IntakeFeederSource,
} from "@/lib/cases/feeder-from-reporter";

/** Maps public intake API / form fields to the same normalized keys used by CSV import. */
const SUBMISSION_FIELD_MAP: Record<string, string> = {
  contact_first_name: "first_name",
  contact_last_name: "last_name",
  contact_street: "street_address",
  contact_city: "city",
  contact_state: "state",
  contact_zip: "zip_code",
  contact_county: "county",
  contact_email: "email",
  contact_phone: "phone_number",
  contact_name: "contact_name",
  relationship_to_cats: "relationship_to_cats",
  colony_address: "colony_street_address",
  colony_city: "colony_city",
  colony_state: "colony_state",
  colony_zip: "colony_zip_code",
  colony_county: "colony_county",
  apartment_name: "apartment_name",
  kittens_under_8_weeks: "kittens_under_8_weeks",
  cats_over_8_weeks: "cats_over_8_weeks",
  pregnant_count: "pregnant_count",
  feeding_cats: "feeding_cats",
  feeder_if_not: "feeder_if_not",
  trapping_experience: "trapping_experience",
  need_traps: "need_traps",
  willing_to_trap_transport: "willing_to_trap_transport",
  able_to_trap_transport: "able_to_trap_transport",
  has_recovery_space: "has_recovery_space",
  intake_notes: "colony_notes",
  how_heard: "how_heard",
  consent_communications: "consent_communications",
};

export interface CommunityIntakeSubmission {
  contact_first_name: string;
  contact_last_name: string;
  contact_street: string;
  contact_city: string;
  contact_state: string;
  contact_zip: string;
  contact_county: string;
  contact_email: string;
  contact_phone: string;
  relationship_to_cats: string;
  colony_address: string;
  colony_city: string;
  colony_state: string;
  colony_zip: string;
  colony_county: string;
  colony_lat?: number | null;
  colony_lng?: number | null;
  apartment_name: string;
  kittens_under_8_weeks: number;
  cats_over_8_weeks: number;
  pregnant_count: number;
  feeding_cats: string;
  feeder_if_not: string;
  trapping_experience: string;
  need_traps: string;
  willing_to_trap_transport: string;
  able_to_trap_transport: string;
  has_recovery_space: string;
  intake_notes: string;
  how_heard: string;
  consent_communications: boolean;
}

export function submissionToImportRow(
  body: Record<string, unknown>
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    const mapped = SUBMISSION_FIELD_MAP[key];
    if (!mapped || value == null) continue;
    if (typeof value === "boolean") {
      raw[mapped] = value ? "Yes" : "No";
    } else {
      raw[mapped] = value;
    }
  }

  if (!raw.first_name && !raw.last_name && body.contact_name) {
    const name = String(body.contact_name).trim();
    const parts = name.split(/\s+/);
    raw.first_name = parts[0] ?? "";
    raw.last_name = parts.slice(1).join(" ");
  }

  return raw;
}

export function mapCommunityIntakeToHelpRequest(
  body: Record<string, unknown>,
  actorName: string
): { error?: string; record?: Record<string, unknown> } {
  const raw = submissionToImportRow(body);

  const email = String(raw.email ?? body.contact_email ?? "").trim();
  const phone = String(raw.phone_number ?? body.contact_phone ?? "").trim();
  if (!email && !phone) {
    return { error: "Email and phone are required." };
  }

  const mapped = mapImportRowToHelpRequest(raw, actorName);
  if (mapped.error || !mapped.record) {
    return mapped;
  }

  const record = {
    ...mapped.record,
    status: "new_intake",
    colony_lat:
      typeof body.colony_lat === "number" ? body.colony_lat : null,
    colony_lng:
      typeof body.colony_lng === "number" ? body.colony_lng : null,
    medical_flags: detectMedicalKeywords(String(mapped.record.intake_notes ?? "")),
    history_log: [
      {
        timestamp: new Date().toISOString(),
        action: "created",
        actor_email: null,
        actor_name: actorName,
        details: "Public community intake form",
      },
    ],
  };

  return {
    record: applyReporterAsFeederIfNeeded(record) as Record<string, unknown>,
  };
}
