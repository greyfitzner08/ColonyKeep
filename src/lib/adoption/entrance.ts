export type EntranceReviewStatus = "pending" | "approved" | "denied";

export type EntranceFieldKind = "text" | "textarea" | "date" | "yesno" | "select";

export interface EntranceFieldOption {
  value: string;
  label: string;
}

export interface EntranceField {
  key: string;
  label: string;
  kind: EntranceFieldKind;
  required?: boolean;
  options?: EntranceFieldOption[];
  /** Hidden on the public form. Adoption staff fill these in after submission. */
  staff?: boolean;
  /** Filled from the submission time. One stamp, not a second date field. */
  submittedStamp?: boolean;
}

export interface EntranceSection {
  id: string;
  title: string;
  fields: EntranceField[];
}

const YES_NO: EntranceFieldOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const GENDERS: EntranceFieldOption[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "unknown", label: "Unknown" },
];

const ADOPTER_APPLICATION_STATUSES: EntranceFieldOption[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

const FEE_RECEIVED_BY: EntranceFieldOption[] = [
  { value: "pet_store", label: "Pet Store" },
  { value: "fff", label: "FFF" },
];

const STAFF_ONLY_SECTIONS = new Set([
  "adoption_review",
  "adoption_completion",
  "follow_up",
  "reconciliation",
]);

const ENTRANCE_SECTION_SOURCE: EntranceSection[] = [
  {
    id: "profile",
    title: "Cat Profile",
    fields: [
      { key: "cat_name", label: "Cat’s Name", kind: "text", required: true },
      { key: "current_status", label: "Current Status", kind: "text", staff: true },
      { key: "adopted", label: "Adopted?", kind: "yesno", staff: true },
      { key: "petfinder_only", label: "Petfinder Only?", kind: "yesno", staff: true },
      { key: "order_to_place", label: "Order to Place / Points", kind: "text", staff: true },
      { key: "gender", label: "Gender", kind: "select", options: GENDERS },
      { key: "description_breed", label: "Description / Breed", kind: "textarea" },
      { key: "personality", label: "Personality", kind: "textarea" },
      { key: "bonded_with", label: "Bonded With", kind: "text" },
      { key: "new_name", label: "New Name", kind: "text" },
      { key: "notes", label: "Notes", kind: "textarea", staff: true },
    ],
  },
  {
    id: "intake",
    title: "Intake & Background",
    fields: [
      {
        key: "date_referred",
        label: "Date Referred to FFF",
        kind: "date",
        staff: true,
        submittedStamp: true,
      },
      { key: "how_referred", label: "How Referred", kind: "text" },
      { key: "trapper_provider", label: "Trapper / Provider", kind: "text" },
      { key: "location_before_entry", label: "Location Before Entry", kind: "text" },
      { key: "where_found", label: "Where Found / Situation", kind: "textarea" },
      { key: "estimated_age", label: "Estimated Age at Referral", kind: "text" },
      { key: "date_of_birth", label: "Date of Birth (Estimated or Actual)", kind: "date" },
      { key: "food_preferences", label: "Food Preferences", kind: "text" },
    ],
  },
  {
    id: "veterinary",
    title: "Veterinary Care",
    fields: [
      { key: "date_spayed_neutered", label: "Date Spayed / Neutered", kind: "date" },
      { key: "location_spayed_neutered", label: "Location Spayed / Neutered", kind: "text" },
      { key: "ear_tip", label: "Ear Tip?", kind: "yesno" },
      { key: "vaccinations", label: "Vaccinations / Dates", kind: "textarea" },
      { key: "prior_vet_record", label: "Prior Veterinary Record / Clinic Name", kind: "text" },
      { key: "tests_treatments", label: "Tests / Treatments", kind: "textarea" },
      { key: "next_vet_care_due", label: "Next Veterinary Care Due", kind: "text", staff: true },
      { key: "microchipped", label: "Microchipped?", kind: "yesno" },
      { key: "microchip_brand", label: "Microchip Brand", kind: "text" },
      { key: "microchip_number", label: "Microchip Number", kind: "text" },
    ],
  },
  {
    id: "foster",
    title: "Foster Information",
    fields: [
      { key: "foster_name", label: "Foster Name", kind: "text" },
      { key: "foster_agreement_signed", label: "Foster Agreement Signed?", kind: "yesno" },
      { key: "foster_phone", label: "Foster Phone", kind: "text" },
      { key: "foster_email", label: "Foster Email", kind: "text" },
      { key: "foster_address", label: "Foster Address", kind: "textarea" },
      { key: "approved_pet_store", label: "Approved for Pet Store Placement?", kind: "yesno", staff: true },
      { key: "date_placed_pet_store", label: "Date Placed at Pet Store", kind: "date", staff: true },
      { key: "date_left_pet_store", label: "Date Left Pet Store", kind: "date", staff: true },
      {
        key: "reason_left_pet_store",
        label: "Reason Left Pet Store, if Not Adopted",
        kind: "textarea",
        staff: true,
      },
    ],
  },
  {
    id: "adoption_review",
    title: "Adoption Review",
    fields: [
      { key: "adopter_name", label: "Adopter Name", kind: "text", staff: true },
      { key: "adoption_application_date", label: "Adoption Application Date", kind: "date" },
      { key: "check_dna_list", label: "Check DNA List?", kind: "yesno" },
      { key: "fff_receipt_acknowledged", label: "FFF Receipt Acknowledged?", kind: "yesno" },
      {
        key: "adopter_application_status",
        label: "Application Status: Approved / Declined / Pending",
        kind: "select",
        options: ADOPTER_APPLICATION_STATUSES,
      },
      { key: "reason_for_decline", label: "Reason for Decline", kind: "textarea" },
      { key: "date_adopter_notified", label: "Date Adopter Notified", kind: "date" },
      { key: "adopter_phone", label: "Adopter Phone", kind: "text" },
      { key: "adopter_email", label: "Adopter Email", kind: "text" },
      { key: "adopter_address", label: "Adopter Address", kind: "textarea" },
      { key: "verified_owner", label: "Verified Owner?", kind: "yesno" },
    ],
  },
  {
    id: "adoption_completion",
    title: "Adoption Completion",
    fields: [
      { key: "contract_discussed", label: "Adoption Contract Discussed?", kind: "yesno" },
      { key: "contract_signed", label: "Adoption Contract Signed?", kind: "yesno" },
      { key: "medical_records_given", label: "Medical Records Emailed / Given?", kind: "yesno" },
      { key: "handouts_given", label: "Adoption Handouts Emailed / Given?", kind: "yesno" },
      { key: "cat_delivered", label: "Cat Delivered?", kind: "yesno" },
      { key: "adoption_fee", label: "Adoption Fee", kind: "text" },
      {
        key: "fee_received_by",
        label: "Fee Received By: Pet Store / FFF",
        kind: "select",
        options: FEE_RECEIVED_BY,
      },
      { key: "fee_sent_to_treasurer", label: "Fee Sent to Treasurer?", kind: "yesno" },
    ],
  },
  {
    id: "follow_up",
    title: "Post-Adoption Follow-Up",
    fields: [
      {
        key: "first_week_check_completed",
        label: "First-Week Welfare Check Completed?",
        kind: "yesno",
      },
      { key: "first_week_check_date", label: "First-Week Welfare Check Date", kind: "date" },
      {
        key: "microchip_registration_discussed",
        label: "Microchip Registration Discussed?",
        kind: "yesno",
      },
      { key: "one_month_follow_up_completed", label: "One-Month Follow-Up Completed?", kind: "yesno" },
      { key: "one_month_follow_up_date", label: "One-Month Follow-Up Date", kind: "date" },
      {
        key: "microchip_registration_confirmed",
        label: "Microchip Registration Confirmed?",
        kind: "yesno",
      },
    ],
  },
  {
    id: "reconciliation",
    title: "Pet Store Reconciliation",
    fields: [
      {
        key: "pet_store_payments",
        label: "Pet Store Payments Received vs. Expected for Previous Month",
        kind: "textarea",
      },
      { key: "reconciliation_notes", label: "Reconciliation Notes", kind: "textarea" },
    ],
  },
];

export const ENTRANCE_SECTIONS: EntranceSection[] = ENTRANCE_SECTION_SOURCE.map((section) =>
  STAFF_ONLY_SECTIONS.has(section.id)
    ? { ...section, fields: section.fields.map((field) => ({ ...field, staff: true })) }
    : section
);

export const ENTRANCE_FIELDS = ENTRANCE_SECTIONS.flatMap((section) => section.fields);

export function publicEntranceSections(): EntranceSection[] {
  return ENTRANCE_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.filter((field) => !field.staff),
  })).filter((section) => section.fields.length > 0);
}

const FIELD_BY_KEY = new Map(ENTRANCE_FIELDS.map((field) => [field.key, field]));

export const ENTRANCE_REVIEW_STATUSES: { value: EntranceReviewStatus; label: string }[] = [
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Declined" },
];

export type EntranceAnswers = Record<string, string>;

export interface AdoptionEntranceApplication {
  id: string;
  status: EntranceReviewStatus;
  cat_name: string;
  answers: EntranceAnswers;
  denial_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  adoptable_cat_id: string | null;
  created_at: string;
  updated_at: string;
}

export function emptyEntranceAnswers(): EntranceAnswers {
  return Object.fromEntries(ENTRANCE_FIELDS.map((field) => [field.key, ""]));
}

function allowedValue(field: EntranceField, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (field.kind === "yesno" && trimmed !== "yes" && trimmed !== "no") return null;
  if (field.kind === "select") {
    const allowed = new Set((field.options ?? []).map((option) => option.value));
    if (!allowed.has(trimmed)) return null;
  }
  if (field.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  if (trimmed.length > 4000) return trimmed.slice(0, 4000);
  return trimmed;
}

export function submissionDateStamp(value: string | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function sanitizeEntranceAnswers(
  input: unknown,
  options: { includeStaff?: boolean } = {}
): { answers: EntranceAnswers; error?: string } {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const answers = emptyEntranceAnswers();
  for (const field of ENTRANCE_FIELDS) {
    if (field.staff && !options.includeStaff) continue;
    if (field.submittedStamp) continue;
    const raw = source[field.key];
    if (raw == null || raw === "") continue;
    if (typeof raw !== "string") {
      return { answers, error: `${field.label} must be text.` };
    }
    const next = allowedValue(field, raw);
    if (next == null) {
      return { answers, error: `Choose a valid answer for ${field.label}` };
    }
    answers[field.key] = next;
  }
  if (!answers.cat_name) {
    return { answers, error: "Enter the cat’s name." };
  }
  return { answers };
}

export function entranceOptionLabel(fieldKey: string, value: string): string {
  if (!value) return "—";
  const field = FIELD_BY_KEY.get(fieldKey);
  if (!field) return value;
  if (field.kind === "yesno") return value === "yes" ? "Yes" : value === "no" ? "No" : value;
  const match = field.options?.find((option) => option.value === value);
  return match?.label ?? value;
}

export function entranceReviewStatusLabel(status: EntranceReviewStatus): string {
  return ENTRANCE_REVIEW_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}
