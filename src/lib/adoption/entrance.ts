export type EntranceReviewStatus = "pending" | "approved" | "denied";

export type EntranceFieldKind =
  | "text"
  | "textarea"
  | "date"
  | "yesno"
  | "select"
  | "vaccinations"
  | "vet_care";

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
  /** Heading shown once above the fields that belong together. */
  group?: string;
  /** Kept in saved answers, omitted from every form. */
  hidden?: boolean;
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

export const PET_STORE_OPTIONS: EntranceFieldOption[] = [
  { value: "pet_supermarket_matthews", label: "Pet Supermarket (Matthews)" },
  { value: "other", label: "Other" },
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

const HEAR_ABOUT: EntranceFieldOption[] = [
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "pet_store", label: "PetStore" },
  { value: "fff_volunteer", label: "FFF Volunteer" },
  { value: "other", label: "Other" },
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
      { key: "gender", label: "Gender", kind: "select", options: GENDERS, required: true },
      { key: "breed", label: "Breed", kind: "text" },
      { key: "colors", label: "Color(s)", kind: "text" },
      { key: "date_of_birth", label: "Date of Birth (Estimated or Actual)", kind: "date", required: true },
      { key: "food_preferences", label: "Food Preferences", kind: "text" },
      { key: "personality", label: "Personality", kind: "textarea" },
      { key: "bonded_with", label: "Bonded With", kind: "text" },
      {
        key: "name_changed",
        label: "Has the name been changed from the name on the medical records?",
        kind: "yesno",
      },
      { key: "new_name", label: "New name", kind: "text" },
      { key: "notes", label: "Notes", kind: "textarea", staff: true },
    ],
  },
  {
    id: "location",
    title: "Location",
    fields: [
      { key: "foster_name", label: "Name", kind: "text", group: "Foster" },
      { key: "foster_agreement_signed", label: "Agreement signed?", kind: "yesno", group: "Foster" },
      { key: "foster_phone", label: "Phone", kind: "text", group: "Foster" },
      { key: "foster_email", label: "Email", kind: "text", group: "Foster" },
      { key: "location_address", label: "Address", kind: "text", group: "Foster" },
      {
        key: "approved_pet_store",
        label: "Approved for placement?",
        kind: "yesno",
        staff: true,
        group: "Pet store",
      },
      {
        key: "pet_store_name",
        label: "Store",
        kind: "select",
        options: PET_STORE_OPTIONS,
        staff: true,
        group: "Pet store",
      },
      { key: "pet_store_other_name", label: "Pet store name", kind: "text", staff: true, group: "Pet store" },
      { key: "pet_store_phone", label: "Phone", kind: "text", staff: true, group: "Pet store" },
      { key: "pet_store_email", label: "Email", kind: "text", staff: true, group: "Pet store" },
      { key: "pet_store_contact_name", label: "Contact name", kind: "text", staff: true, hidden: true },
      { key: "pet_store_address", label: "Address", kind: "text", staff: true, hidden: true },
      { key: "pet_store_city", label: "City", kind: "text", staff: true, hidden: true },
      { key: "pet_store_state", label: "State", kind: "text", staff: true, hidden: true },
      { key: "pet_store_zip", label: "ZIP", kind: "text", staff: true, hidden: true },
      { key: "pet_store_notes", label: "Notes", kind: "textarea", staff: true, hidden: true },
      { key: "date_placed_pet_store", label: "Date placed", kind: "date", staff: true, hidden: true },
      { key: "date_left_pet_store", label: "Date left", kind: "date", staff: true, hidden: true },
      {
        key: "reason_left_pet_store",
        label: "Reason left, if not adopted",
        kind: "textarea",
        staff: true,
        hidden: true,
      },
      { key: "location_notes", label: "Notes", kind: "textarea", staff: true },
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
      { key: "how_referred", label: "How did you hear about us", kind: "select", options: HEAR_ABOUT },
      { key: "fff_volunteer_name", label: "FFF Volunteer Name", kind: "text" },
      { key: "trapper_provider", label: "Who told you?", kind: "text" },
      { key: "location_before_entry", label: "Location Before Entry", kind: "text" },
      { key: "where_found", label: "Where Found / Situation", kind: "textarea" },
      { key: "estimated_age", label: "Estimated Age at Referral", kind: "text" },
    ],
  },
  {
    id: "veterinary",
    title: "Veterinary Care",
    fields: [
      { key: "date_spayed_neutered", label: "Date Spayed / Neutered", kind: "date" },
      { key: "location_spayed_neutered", label: "Location Spayed / Neutered", kind: "text" },
      { key: "ear_tip", label: "Ear Tip?", kind: "yesno" },
      { key: "vaccinations", label: "Vaccinations", kind: "vaccinations" },
      { key: "prior_vet_record", label: "Prior Veterinary Record / Clinic Name", kind: "text" },
      { key: "tests_treatments", label: "Tests / Treatments", kind: "textarea" },
      { key: "next_vet_care_due", label: "Next Veterinary Care Due", kind: "vet_care", staff: true },
      { key: "microchipped", label: "Microchipped?", kind: "yesno" },
      { key: "microchip_brand", label: "Microchip Brand", kind: "text" },
      { key: "microchip_number", label: "Microchip Number", kind: "text" },
    ],
  },
  {
    id: "adoption_review",
    title: "Adoption Review",
    fields: [
      { key: "linked_adoption_application_id", label: "Linked adoption application", kind: "text", staff: true },
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
    title: section.id === "location" ? "Foster Information" : section.title,
    fields: section.fields.filter((field) => !field.staff && !field.hidden),
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

export const VACCINATION_TYPES = [
  { value: "rabies", label: "Rabies" },
  { value: "fvrcp", label: "FVRCP" },
  { value: "other", label: "Other" },
] as const;

export type VaccinationType = (typeof VACCINATION_TYPES)[number]["value"];

export interface VaccinationEntry {
  type: VaccinationType | "";
  other: string;
  date: string;
}

export function entranceFieldLabel(field: EntranceField, answers?: EntranceAnswers): string {
  if (field.key === "fff_volunteer_name") return "FFF Volunteer Name";
  if (field.key !== "trapper_provider") return field.label;
  const how = answers?.how_referred;
  if (how === "family") return "Which family member?";
  if (how === "friend") return "Which friend?";
  if (how === "pet_store") return "Which PetStore?";
  if (how === "other") return "Please explain";
  return "Who told you?";
}

export function entranceFieldSpansRow(field: Pick<EntranceField, "kind" | "key">): boolean {
  return (
    field.kind === "textarea" ||
    field.kind === "vaccinations" ||
    field.kind === "vet_care" ||
    field.key === "name_changed" ||
    field.key === "approved_pet_store" ||
    field.key === "location_address"
  );
}

const PET_STORE_QUESTION_KEYS = [
  "pet_store_name",
  "pet_store_other_name",
  "pet_store_phone",
  "pet_store_email",
] as const;

function clearPetStoreQuestions(answers: EntranceAnswers) {
  for (const key of PET_STORE_QUESTION_KEYS) answers[key] = "";
}

const SINGLE_LINE_ADDRESS_KEYS = ["location_address"];

export function condenseAddressLine(parts: {
  address: string;
  city: string;
  state: string;
  zip: string;
  formatted_address?: string;
}): string {
  const formatted = parts.formatted_address?.trim() ?? "";
  if (formatted) return formatted;
  const street = parts.address.trim();
  const cityState = [parts.city.trim(), parts.state.trim()].filter(Boolean).join(", ");
  const tail = [cityState, parts.zip.trim()].filter(Boolean).join(" ");
  if (!tail) return street;
  if (street.toLowerCase().includes(tail.toLowerCase())) return street;
  if (parts.city.trim() && street.toLowerCase().includes(parts.city.trim().toLowerCase())) return street;
  return [street, tail].filter(Boolean).join(", ");
}

export function entrancePlaceAddressKey(key: string): string | null {
  return SINGLE_LINE_ADDRESS_KEYS.find((entry) => key === entry || key.endsWith(`-${entry}`)) ?? null;
}

export function applyEntranceAddress(
  answers: EntranceAnswers,
  key: string,
  parts: { address: string; city: string; state: string; zip: string; formatted_address?: string }
): EntranceAnswers {
  const addressKey = entrancePlaceAddressKey(key);
  const line = condenseAddressLine(parts);
  if (!addressKey) return { ...answers, [key]: line };
  return { ...answers, [addressKey]: line };
}

export function petStoreChoiceFromName(value: string): "pet_supermarket_matthews" | "other" | "" {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "pet_supermarket_matthews") return "pet_supermarket_matthews";
  const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (key.includes("pet supermarket")) return "pet_supermarket_matthews";
  return "other";
}

export function petStoreDisplayName(answers: EntranceAnswers | undefined): string {
  if (!answers || answers.approved_pet_store !== "yes") return "";
  if (answers.pet_store_name === "other") return (answers.pet_store_other_name ?? "").trim();
  return PET_STORE_OPTIONS.find((option) => option.value === answers.pet_store_name)?.label ?? "";
}

export function applyEntranceAnswer(
  answers: EntranceAnswers,
  key: string,
  value: string
): EntranceAnswers {
  const next = { ...answers, [key]: value };
  if (key === "name_changed" && value !== "yes") next.new_name = "";
  if (key === "how_referred" && value !== "fff_volunteer") next.fff_volunteer_name = "";
  if (key === "approved_pet_store" && value !== "yes") clearPetStoreQuestions(next);
  if (key === "pet_store_name" && value !== "other") next.pet_store_other_name = "";
  return next;
}

export function showEntranceField(
  field: Pick<EntranceField, "key" | "hidden">,
  answers: EntranceAnswers
): boolean {
  if (field.hidden) return false;
  if (field.key === "linked_adoption_application_id") return false;
  if (field.key === "fff_volunteer_name") return answers.how_referred === "fff_volunteer";
  if (field.key === "trapper_provider") return answers.how_referred !== "fff_volunteer";
  if (field.key === "new_name") return answers.name_changed === "yes";
  if (field.key === "pet_store_other_name") {
    return answers.approved_pet_store === "yes" && answers.pet_store_name === "other";
  }
  if ((PET_STORE_QUESTION_KEYS as readonly string[]).includes(field.key)) {
    return answers.approved_pet_store === "yes";
  }
  return true;
}

export function missingChangedName(answers: EntranceAnswers): boolean {
  return answers.name_changed === "yes" && !answers.new_name.trim();
}

export function missingVolunteerName(answers: EntranceAnswers): boolean {
  return answers.how_referred === "fff_volunteer" && !(answers.fff_volunteer_name ?? "").trim();
}

export function entranceFieldGroups(
  fields: EntranceField[],
  answers: EntranceAnswers
): { heading: string; fields: EntranceField[] }[] {
  const groups: { heading: string; fields: EntranceField[] }[] = [];
  for (const field of fields) {
    if (!showEntranceField(field, answers)) continue;
    const heading = field.group ?? "";
    const last = groups[groups.length - 1];
    if (!last || last.heading !== heading) groups.push({ heading, fields: [field] });
    else last.fields.push(field);
  }
  return groups;
}

export function entranceFieldGroupClass(heading: string): string {
  if (!heading) return "space-y-3";
  if (heading === "Pet store") {
    return "space-y-3 rounded-lg border-2 border-primary/40 bg-background p-4";
  }
  return "space-y-3 rounded-lg border border-l-4 border-l-primary bg-muted/50 p-4";
}

function formatIsoDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function parseVaccinationList(value: string): VaccinationEntry[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const row = item as Record<string, unknown>;
          const type =
            row.type === "rabies" || row.type === "fvrcp" || row.type === "other" ? row.type : "";
          const other = typeof row.other === "string" ? row.other : "";
          const date = typeof row.date === "string" ? row.date : "";
          return [{ type, other, date }];
        });
      }
    } catch {
      // Older records stored a sentence instead of a list.
    }
  }
  return [{ type: "other", other: trimmed.slice(0, 200), date: "" }];
}

export function vaccinationListError(rows: VaccinationEntry[]): string | null {
  const filled = rows.filter((row) => row.type || row.date || row.other.trim());
  if (filled.length > 12) return "List up to 12 vaccinations.";
  for (const row of filled) {
    if (!row.type) return "Choose a vaccination type.";
    if (row.type === "other" && !row.other.trim()) return "Describe the other vaccination.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return "Enter the date each vaccination was received.";
  }
  return null;
}

function cleanVaccinations(raw: string): { value: string; error?: string } {
  const rows = parseVaccinationList(raw).filter((row) => row.type || row.date || row.other.trim());
  const error = vaccinationListError(rows);
  if (error) return { value: "", error };
  if (rows.length === 0) return { value: "" };
  return {
    value: JSON.stringify(
      rows.map((row) => ({
        type: row.type,
        other: row.type === "other" ? row.other.trim().slice(0, 200) : "",
        date: row.date,
      }))
    ),
  };
}

/** Readable lines for review screens and the cat roster. */
export function formatVaccinationList(value: string): string {
  return parseVaccinationList(value)
    .filter((row) => row.type)
    .map((row) => {
      const name =
        row.type === "rabies" ? "Rabies" : row.type === "fvrcp" ? "FVRCP" : row.other.trim() || "Other";
      const date = formatIsoDate(row.date);
      return date ? `${name} — ${date}` : name;
    })
    .join("\n");
}

export interface VetCareDueEntry {
  service: string;
  date: string;
}

export interface VetCareDueAlert {
  applicationId: string;
  catName: string;
  service: string;
  date: string;
}

export function parseVetCareDueList(value: string): VetCareDueEntry[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const row = item as Record<string, unknown>;
          return [
            {
              service: typeof row.service === "string" ? row.service : "",
              date: typeof row.date === "string" ? row.date : "",
            },
          ];
        });
      }
    } catch {
      // Older records stored a sentence instead of a list.
    }
  }
  return [{ service: trimmed.slice(0, 200), date: "" }];
}

export function vetCareDueListError(rows: VetCareDueEntry[]): string | null {
  const filled = rows.filter((row) => row.service.trim() || row.date);
  if (filled.length > 12) return "List up to 12 veterinary services.";
  for (const row of filled) {
    if (!row.service.trim()) return "Enter the service for each due date.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return "Enter the date each service is due.";
  }
  return null;
}

function cleanVetCareDue(raw: string): { value: string; error?: string } {
  const rows = parseVetCareDueList(raw).filter((row) => row.service.trim() || row.date);
  const error = vetCareDueListError(rows);
  if (error) return { value: "", error };
  if (rows.length === 0) return { value: "" };
  return {
    value: JSON.stringify(
      rows.map((row) => ({
        service: row.service.trim().slice(0, 200),
        date: row.date,
      }))
    ),
  };
}

export function formatVetCareDueList(value: string): string {
  return parseVetCareDueList(value)
    .filter((row) => row.service.trim() || row.date)
    .map((row) => {
      const service = row.service.trim() || "Service";
      const date = formatIsoDate(row.date);
      return date ? `${service} — ${date}` : service;
    })
    .join("\n");
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysUntilVetCare(date: string, asOf = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  const today = startOfLocalDay(asOf);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function collectVetCareDueAlerts(
  applications: {
    id: string;
    cat_name: string;
    status: string;
    answers: Record<string, string | undefined>;
  }[]
): VetCareDueAlert[] {
  const alerts: VetCareDueAlert[] = [];
  for (const application of applications) {
    if (application.status === "denied") continue;
    if (application.answers.adopted === "yes") continue;
    const renamed =
      application.answers.name_changed === "yes" ? application.answers.new_name?.trim() : "";
    const catName = renamed || application.cat_name.trim() || "Cat";
    for (const row of parseVetCareDueList(application.answers.next_vet_care_due ?? "")) {
      if (daysUntilVetCare(row.date) == null) continue;
      const service = row.service.trim();
      if (!service) continue;
      alerts.push({
        applicationId: application.id,
        catName,
        service,
        date: row.date,
      });
    }
  }
  return alerts.sort((a, b) => a.date.localeCompare(b.date) || a.catName.localeCompare(b.catName));
}

/** Overdue dates, plus dates due within the next week — the same window as birthday banners. */
export function upcomingVetCareAlerts(
  alerts: VetCareDueAlert[],
  asOf = new Date(),
  withinDays = 7
): VetCareDueAlert[] {
  return alerts
    .filter((alert) => {
      const days = daysUntilVetCare(alert.date, asOf);
      return days != null && days <= withinDays;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.catName.localeCompare(b.catName));
}

export function vetCareDueTimingLabel(date: string, asOf = new Date()): string {
  const days = daysUntilVetCare(date, asOf);
  if (days == null) return "";
  if (days < 0) return days === -1 ? "1 day overdue" : `${-days} days overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return formatIsoDate(date);
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
  const source = input && typeof input === "object" ? { ...(input as Record<string, unknown>) } : {};
  normalizePetStoreSource(source);
  const answers = emptyEntranceAnswers();
  for (const field of ENTRANCE_FIELDS) {
    if (field.staff && !options.includeStaff) continue;
    if (field.submittedStamp) continue;
    const raw = source[field.key];
    if (raw == null || raw === "") continue;
    if (typeof raw !== "string") {
      return { answers, error: `${field.label} must be text.` };
    }
    if (field.kind === "vaccinations") {
      const cleaned = cleanVaccinations(raw);
      if (cleaned.error) return { answers, error: cleaned.error };
      answers[field.key] = cleaned.value;
      continue;
    }
    if (field.kind === "vet_care") {
      const cleaned = cleanVetCareDue(raw);
      if (cleaned.error) return { answers, error: cleaned.error };
      answers[field.key] = cleaned.value;
      continue;
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
  if (answers.name_changed !== "yes") answers.new_name = "";
  if (answers.name_changed === "yes" && !answers.new_name.trim()) {
    return { answers, error: "Enter the new name." };
  }
  if (answers.how_referred === "fff_volunteer" && !(answers.fff_volunteer_name ?? "").trim()) {
    return { answers, error: "Enter the FFF volunteer’s name." };
  }
  if (!options.includeStaff && !answers.gender) {
    return { answers, error: "Choose the cat’s gender." };
  }
  if (!options.includeStaff && !/^\d{4}-\d{2}-\d{2}$/.test(answers.date_of_birth)) {
    return { answers, error: "Enter the cat’s date of birth." };
  }
  if (answers.approved_pet_store !== "yes") clearPetStoreQuestions(answers);
  if (answers.approved_pet_store === "yes" && !answers.pet_store_name.trim()) {
    return { answers, error: "Choose the pet store." };
  }
  if (answers.pet_store_name !== "other") answers.pet_store_other_name = "";
  if (answers.approved_pet_store === "yes" && answers.pet_store_name === "other" && !answers.pet_store_other_name.trim()) {
    return { answers, error: "Enter the pet store name." };
  }
  return { answers };
}

function normalizePetStoreSource(source: Record<string, unknown>) {
  const raw = typeof source.pet_store_name === "string" ? source.pet_store_name.trim() : "";
  if (!raw) return;
  const choice = petStoreChoiceFromName(raw);
  if (choice === "other" && raw !== "other") {
    const other = typeof source.pet_store_other_name === "string" ? source.pet_store_other_name.trim() : "";
    if (!other) source.pet_store_other_name = raw;
  }
  source.pet_store_name = choice;
}

export function entranceOptionLabel(fieldKey: string, value: string): string {
  if (!value) return "—";
  const field = FIELD_BY_KEY.get(fieldKey);
  if (!field) return value;
  if (field.kind === "vaccinations") return formatVaccinationList(value) || "—";
  if (field.kind === "vet_care") return formatVetCareDueList(value) || "—";
  if (field.kind === "yesno") return value === "yes" ? "Yes" : value === "no" ? "No" : value;
  const match = field.options?.find((option) => option.value === value);
  return match?.label ?? value;
}

export function entranceReviewStatusLabel(status: EntranceReviewStatus): string {
  return ENTRANCE_REVIEW_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}
