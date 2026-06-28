/** Columns that exist on help_requests per migrations 001, 005, 016. */
export const HELP_REQUEST_INSERT_COLUMNS = new Set([
  "case_number",
  "status",
  "contact_name",
  "contact_email",
  "contact_phone",
  "contact_first_name",
  "contact_last_name",
  "contact_street",
  "contact_city",
  "contact_state",
  "contact_zip",
  "contact_county",
  "colony_address",
  "colony_city",
  "colony_state",
  "colony_county",
  "colony_zip",
  "colony_lat",
  "colony_lng",
  "kittens_under_8_weeks",
  "cats_over_8_weeks",
  "reported_kittens_under_8_weeks",
  "reported_cats_over_8_weeks",
  "pregnant_count",
  "feeding_cats",
  "feeder_if_not",
  "trapping_experience",
  "need_traps",
  "willing_to_trap_transport",
  "able_to_trap_transport",
  "has_recovery_space",
  "can_help",
  "has_traps",
  "can_transport",
  "consent_communications",
  "newsletter_list_added_at",
  "relationship_to_cats",
  "how_heard",
  "apartment_name",
  "assigned_team_id",
  "assigned_team_name",
  "claimed_by_email",
  "claimed_by_name",
  "intake_notes",
  "follow_up_log",
  "follow_up_due_date",
  "medical_flags",
  "medical_flag_dismissed",
  "medical_flag_forced",
  "outcome",
  "closure_notes",
  "resolution",
  "closed_at",
  "trapper_trap_loaner",
  "additional_notes",
  "outcome_tnvr_count",
  "outcome_acc_count",
  "outcome_foster_count",
  "outcome_other_count",
  "cats_remaining",
  "history_log",
  "created_by",
  "created_at",
  "updated_at",
]);

export function sanitizeHelpRequestRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (!HELP_REQUEST_INSERT_COLUMNS.has(key)) continue;
    if (value === undefined) continue;
    if (key === "case_number" && (value === null || value === "")) continue;
    sanitized[key] = value;
  }

  return sanitized;
}
