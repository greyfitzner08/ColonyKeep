import { parseCsvRecords, recordsToObjects } from "@/lib/csv";
import { ADOPTABLE_CAT_STATUSES } from "@/lib/adoption/constants";
import {
  ENTRANCE_FIELDS,
  sanitizeEntranceAnswers,
  type EntranceAnswers,
  type EntranceField,
} from "@/lib/adoption/entrance";

export const CAT_IMPORT_TEMPLATE_HEADERS = [
  "Cat name",
  "Current status",
  "Adopted",
  "Gender",
  "Date of birth",
  "Estimated age",
  "Breed",
  "Colors",
  "Personality",
  "Bonded with",
  "Notes",
  "Foster home",
  "Foster contact name",
  "Foster phone",
  "Foster email",
  "Foster address",
  "Foster city",
  "Foster state",
  "Foster ZIP",
  "Foster notes",
  "Located at a pet store",
  "Pet store",
  "Pet store contact name",
  "Pet store phone",
  "Pet store email",
  "Pet store address",
  "Pet store city",
  "Pet store state",
  "Pet store ZIP",
  "Date spayed or neutered",
  "Ear tip",
  "Microchipped",
  "Microchip number",
  "Tests and treatments",
  "Vaccinations",
  "Next veterinary care due",
] as const;

const MAX_IMPORT_ROWS = 200;

const SKIPPED_KEYS = new Set(["linked_adoption_application_id", "date_referred"]);

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function headerKeyMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const field of ENTRANCE_FIELDS) {
    if (field.submittedStamp || SKIPPED_KEYS.has(field.key)) continue;
    map[normalizeHeader(field.label)] = field.key;
    map[normalizeHeader(field.key.replace(/_/g, " "))] = field.key;
  }
  const aliases: Record<string, string> = {
    "cat name": "cat_name",
    "cats name": "cat_name",
    name: "cat_name",
    status: "current_status",
    adopted: "adopted",
    sex: "gender",
    dob: "date_of_birth",
    birthday: "date_of_birth",
    "date of birth": "date_of_birth",
    age: "estimated_age",
    "estimated age": "estimated_age",
    color: "colors",
    colours: "colors",
    "foster home": "location_name",
    foster: "location_name",
    "foster contact name": "location_contact_name",
    "foster phone": "location_phone",
    "foster email": "location_email",
    "foster address": "location_address",
    "foster city": "location_city",
    "foster state": "location_state",
    "foster zip": "location_zip",
    "foster notes": "location_notes",
    "located at a pet store": "at_pet_store",
    "at a pet store": "at_pet_store",
    "pet store": "pet_store_name",
    "date spayed or neutered": "date_spayed_neutered",
    "spay date": "date_spayed_neutered",
    "neuter date": "date_spayed_neutered",
    "ear tip": "ear_tip",
    microchipped: "microchipped",
    "microchip number": "microchip_number",
    "tests and treatments": "tests_treatments",
    vaccinations: "vaccinations",
    "next veterinary care due": "next_vet_care_due",
    "next vet care due": "next_vet_care_due",
    "bonded with": "bonded_with",
  };
  return { ...map, ...aliases };
}

const HEADER_KEYS = headerKeyMap();

function isRealDate(iso: string): boolean {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function normalizeImportDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return isRealDate(trimmed) ? trimmed : null;
  const parts = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(trimmed);
  if (!parts) return null;
  let year = Number(parts[3]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  const next = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isRealDate(next) ? next : null;
}

function normalizeYesNo(value: string): "yes" | "no" | "" | null {
  const key = normalizeHeader(value);
  if (!key) return "";
  if (["yes", "y", "true", "t", "1", "x", "checked", "adopted"].includes(key)) return "yes";
  if (["no", "n", "false", "f", "0", "not adopted", "unadopted", "unchecked"].includes(key)) return "no";
  if (
    [
      "na",
      "n a",
      "none",
      "unknown",
      "not applicable",
      "not sure",
      "not yet",
      "tbd",
      "blank",
      "null",
    ].includes(key)
  ) {
    return "";
  }
  return null;
}

function normalizeGender(value: string): "female" | "male" | "unknown" | "" | null {
  const key = normalizeHeader(value);
  if (!key) return "";
  if (["na", "n a", "none", "not applicable", "blank", "null", "tbd"].includes(key)) return "";
  if (
    key === "f" ||
    key === "female" ||
    key === "girl" ||
    key === "queen" ||
    key === "fs" ||
    key === "f s" ||
    key.startsWith("female ") ||
    key.startsWith("spayed") ||
    key.includes("female")
  ) {
    return "female";
  }
  if (
    key === "m" ||
    key === "male" ||
    key === "boy" ||
    key === "tom" ||
    key === "mn" ||
    key === "m n" ||
    key.startsWith("male ") ||
    key.startsWith("neutered") ||
    key.includes("male")
  ) {
    return "male";
  }
  if (key === "u" || key === "unknown" || key === "unsure" || key === "other") return "unknown";
  return null;
}

function canonicalStatus(value: string): string | null {
  const key = normalizeHeader(value);
  if (!key) return "";
  const match = ADOPTABLE_CAT_STATUSES.find(
    (entry) => normalizeHeader(entry.value) === key || normalizeHeader(entry.label) === key
  );
  if (match) return match.value;
  if (key === "pending") return "pending";
  if (key === "hold" || key === "on hold") return "hold";
  return null;
}

function splitList(value: string): string[] {
  return value
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function datedItem(part: string): { name: string; date: string | null } {
  const match = /(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/.exec(part);
  if (!match) return { name: part.trim(), date: "" };
  const date = normalizeImportDate(match[1]);
  const name = part
    .replace(match[1], "")
    .replace(/[—–|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { name, date };
}

function toVaccinationJson(value: string): { value: string; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { value: "" };
  if (trimmed.startsWith("[")) return { value: trimmed };
  const rows = splitList(trimmed).map((part) => {
    const item = datedItem(part);
    const label = item.name.toLowerCase();
    if (label === "rabies" || label.startsWith("rabies ")) {
      return { type: "rabies", other: "", date: item.date ?? "" };
    }
    if (label === "fvrcp" || label.startsWith("fvrcp ")) {
      return { type: "fvrcp", other: "", date: item.date ?? "" };
    }
    return { type: "other", other: item.name, date: item.date ?? "" };
  });
  if (rows.some((row) => row.date == null)) {
    return { value: "", error: "Use a date like 2024-01-15 for each vaccination." };
  }
  return { value: JSON.stringify(rows) };
}

function toVetCareJson(value: string): { value: string; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { value: "" };
  if (trimmed.startsWith("[")) return { value: trimmed };
  const rows = splitList(trimmed).map((part) => {
    const item = datedItem(part);
    return { service: item.name, date: item.date ?? "" };
  });
  if (rows.some((row) => row.date == null)) {
    return { value: "", error: "Use a date like 2026-10-01 for each veterinary service." };
  }
  return { value: JSON.stringify(rows) };
}

function prepareValue(field: EntranceField, raw: string): { value: string; error?: string; skipped?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: "" };
  if (field.kind === "yesno") {
    if (field.key === "adopted") {
      const status = canonicalStatus(trimmed);
      if (status === "adopted") return { value: "yes" };
      if (status) return { value: "no" };
    }
    const yesNo = normalizeYesNo(trimmed);
    if (yesNo == null) return { value: "", skipped: trimmed };
    return { value: yesNo };
  }
  if (field.kind === "date") {
    const date = normalizeImportDate(trimmed);
    if (!date) return { value: "", error: `Use a date like 2024-01-15 for ${field.label}.` };
    return { value: date };
  }
  if (field.kind === "select") {
    if (field.key === "gender") {
      const gender = normalizeGender(trimmed);
      if (gender == null) return { value: "", skipped: trimmed };
      return { value: gender };
    }
    const key = normalizeHeader(trimmed);
    if (!key) return { value: "" };
    const match = field.options?.find(
      (option) => normalizeHeader(option.value) === key || normalizeHeader(option.label) === key
    );
    if (!match) return { value: "", skipped: trimmed };
    return { value: match.value };
  }
  if (field.key === "current_status") {
    const status = canonicalStatus(trimmed);
    if (status == null) {
      return {
        value: "",
        error: "Choose a status: Available, Pending adoption, On hold, Adopted, or Unavailable.",
      };
    }
    return { value: status };
  }
  if (field.kind === "vaccinations") return toVaccinationJson(trimmed);
  if (field.kind === "vet_care") return toVetCareJson(trimmed);
  return { value: trimmed };
}

export function buildCatImportTemplateCsv(): string {
  return `${CAT_IMPORT_TEMPLATE_HEADERS.join(",")}\n`;
}

export function parseCatImportCsv(text: string): {
  cats: { row: number; answers: EntranceAnswers }[];
  errors: { row: number; error: string }[];
  warnings: { row: number; error: string }[];
  fileError?: string;
} {
  const records = parseCsvRecords(text.replace(/^\uFEFF/, "").trim());
  if (records.length < 2) {
    return { cats: [], errors: [], warnings: [], fileError: "Add a header row and at least one cat." };
  }

  const headers = records[0] ?? [];
  const columns = headers.map((header) => HEADER_KEYS[normalizeHeader(header)] ?? "");
  if (!columns.includes("cat_name")) {
    return {
      cats: [],
      errors: [],
      warnings: [],
      fileError: "The CSV needs a Cat name column. Download the template for the column names.",
    };
  }

  const objects = recordsToObjects(records, 0);
  if (objects.length > MAX_IMPORT_ROWS) {
    return { cats: [], errors: [], warnings: [], fileError: "Import up to 200 cats at a time." };
  }

  const fieldByKey = new Map(ENTRANCE_FIELDS.map((field) => [field.key, field]));
  const cats: { row: number; answers: EntranceAnswers }[] = [];
  const errors: { row: number; error: string }[] = [];
  const warnings: { row: number; error: string }[] = [];

  objects.forEach((record, index) => {
    const rowNumber = index + 2;
    const source: Record<string, string> = {};
    for (const [header, raw] of Object.entries(record)) {
      const key = HEADER_KEYS[normalizeHeader(header)];
      if (!key || SKIPPED_KEYS.has(key)) continue;
      const field = fieldByKey.get(key);
      if (!field) continue;
      const prepared = prepareValue(field, raw);
      if (prepared.error) {
        errors.push({ row: rowNumber, error: prepared.error });
        return;
      }
      if (prepared.skipped) {
        warnings.push({
          row: rowNumber,
          error: `${field.label} was “${prepared.skipped}”, so that answer was left blank.`,
        });
      }
      if (prepared.value) source[key] = prepared.value;
    }

    if (source.current_status === "adopted" && !source.adopted) source.adopted = "yes";
    const parsed = sanitizeEntranceAnswers(source, { includeStaff: true });
    if (parsed.error) {
      errors.push({ row: rowNumber, error: parsed.error });
      return;
    }
    cats.push({ row: rowNumber, answers: parsed.answers });
  });

  if (cats.length === 0 && errors.length === 0) {
    return { cats, errors, warnings, fileError: "Add a header row and at least one cat." };
  }

  return { cats, errors, warnings };
}
