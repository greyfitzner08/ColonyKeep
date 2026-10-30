import type { CommunityPartner, CommunityPartnerContact } from "@/lib/types";
import { parseDisplayDate } from "@/lib/utils";

export function sortPartnerContacts(contacts: CommunityPartnerContact[]): CommunityPartnerContact[] {
  return [...contacts].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
}

export function primaryPartnerContact(
  partner: Pick<CommunityPartner, "contacts">
): CommunityPartnerContact | null {
  const contacts = sortPartnerContacts(partner.contacts ?? []);
  return contacts[0] ?? null;
}

export function partnerHasContactDetails(contact: {
  name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  birthday?: string | null;
}): boolean {
  return Boolean(
    contact.name?.trim() ||
      contact.title?.trim() ||
      contact.email?.trim() ||
      contact.phone?.trim() ||
      contact.notes?.trim() ||
      normalizeContactBirthday(contact.birthday)
  );
}

/** Leap year used so Feb 29 can be stored on a DATE column without collecting a real year. */
export const PARTNER_BIRTHDAY_YEAR = 2000;

export const PARTNER_BIRTHDAY_MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function daysInPartnerBirthdayMonth(month: number): number {
  return new Date(PARTNER_BIRTHDAY_YEAR, month, 0).getDate();
}

function isValidPartnerMonthDay(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInPartnerBirthdayMonth(month);
}

function monthDayToStoredBirthday(month: number, day: number): string | null {
  if (!isValidPartnerMonthDay(month, day)) return null;
  return `${PARTNER_BIRTHDAY_YEAR}-${pad2(month)}-${pad2(day)}`;
}

const MONTH_NAME_LOOKUP: Record<string, number> = Object.fromEntries(
  PARTNER_BIRTHDAY_MONTHS.flatMap((entry, index) => [
    [entry.label.toLowerCase(), index + 1],
    [entry.label.slice(0, 3).toLowerCase(), index + 1],
  ])
);

/** Partner birthdays are month/day only. Stored as DATE using a dummy leap year. */
export function normalizeContactBirthday(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return monthDayToStoredBirthday(value.getMonth() + 1, value.getDate());
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed.slice(0, 10));
  if (iso) {
    return monthDayToStoredBirthday(Number(iso[2]), Number(iso[3]));
  }

  const monthDay = /^(\d{1,2})[/-](\d{1,2})$/.exec(trimmed);
  if (monthDay) {
    return monthDayToStoredBirthday(Number(monthDay[1]), Number(monthDay[2]));
  }

  const named = /^([A-Za-z]+)\s+(\d{1,2})$/.exec(trimmed);
  if (named) {
    const month = MONTH_NAME_LOOKUP[named[1].toLowerCase()];
    if (month) return monthDayToStoredBirthday(month, Number(named[2]));
  }

  const withYear = parseDisplayDate(trimmed);
  if (!withYear) return null;
  return monthDayToStoredBirthday(Number(withYear.slice(5, 7)), Number(withYear.slice(8, 10)));
}

export function parseContactBirthdayParts(value: string | null | undefined): {
  month: string;
  day: string;
} {
  const normalized = normalizeContactBirthday(value);
  if (normalized) {
    return { month: normalized.slice(5, 7), day: normalized.slice(8, 10) };
  }

  const monthOnly = /^(\d{1,2})$/.exec((value ?? "").trim());
  if (monthOnly) {
    const month = Number(monthOnly[1]);
    if (month >= 1 && month <= 12) return { month: pad2(month), day: "" };
  }

  return { month: "", day: "" };
}

export function contactBirthdayFromParts(month: string, day: string): string {
  if (!month) return "";
  if (!day) return month;
  return monthDayToStoredBirthday(Number(month), Number(day)) ?? month;
}

export interface PartnerContactInput {
  id?: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  notes: string;
  birthday: string;
  is_primary: boolean;
}

export const emptyPartnerContactInput = (): PartnerContactInput => ({
  name: "",
  title: "",
  email: "",
  phone: "",
  notes: "",
  birthday: "",
  is_primary: false,
});

export function contactsFromPartner(partner: CommunityPartner): PartnerContactInput[] {
  const contacts = sortPartnerContacts(partner.contacts ?? []);
  if (contacts.length === 0) return [emptyPartnerContactInput()];
  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name ?? "",
    title: contact.title ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    notes: contact.notes ?? "",
    birthday: normalizeContactBirthday(contact.birthday) ?? "",
    is_primary: contact.is_primary,
  }));
}

/** If there are no people yet, fold organization emails/phones into contact rows. */
export function mergeOrganizationIntoContacts(
  contacts: PartnerContactInput[],
  emails: string[],
  phones: string[]
): PartnerContactInput[] {
  if (contacts.some(partnerHasContactDetails)) {
    return contacts.length > 0 ? contacts : [emptyPartnerContactInput()];
  }

  const emailList = normalizePartnerEmails(emails);
  const phoneList = normalizePartnerPhones(phones);
  if (emailList.length === 0 && phoneList.length === 0) {
    return contacts.length > 0 ? contacts : [emptyPartnerContactInput()];
  }

  const count = Math.max(emailList.length, phoneList.length);
  return Array.from({ length: count }, (_, index) => ({
    ...emptyPartnerContactInput(),
    email: emailList[index] ?? "",
    phone: phoneList[index] ?? "",
    is_primary: index === 0,
  }));
}

export function contactFieldsFromPeople(contacts: PartnerContactInput[]): {
  emails: string[];
  phones: string[];
} {
  return {
    emails: normalizePartnerEmails(contacts.map((contact) => contact.email)),
    phones: normalizePartnerPhones(contacts.map((contact) => contact.phone)),
  };
}

export function normalizeContactInputs(contacts: PartnerContactInput[]): PartnerContactInput[] {
  const filled = contacts.filter(partnerHasContactDetails);
  if (filled.length === 0) return [];

  const primaryIndex = filled.findIndex((contact) => contact.is_primary);
  return filled.map((contact, index) => ({
    ...contact,
    birthday: normalizeContactBirthday(contact.birthday) ?? "",
    is_primary: primaryIndex === -1 ? index === 0 : index === primaryIndex,
  }));
}

export function setPrimaryContact(
  contacts: PartnerContactInput[],
  index: number
): PartnerContactInput[] {
  return contacts.map((contact, contactIndex) => ({
    ...contact,
    is_primary: contactIndex === index,
  }));
}

function uniqueTrimmed(values: unknown, lowercase: boolean): string[] {
  const raw = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? values.split(/[\n,;]+/)
      : [];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = lowercase ? entry.trim().toLowerCase() : entry.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function normalizePartnerEmails(value: unknown): string[] {
  return uniqueTrimmed(value, true);
}

export function normalizePartnerPhones(value: unknown): string[] {
  return uniqueTrimmed(value, false);
}

export function partnerEmailList(
  partner: Pick<CommunityPartner, "email" | "emails">
): string[] {
  return normalizePartnerEmails([...(partner.emails ?? []), partner.email ?? ""]);
}

export function partnerPhoneList(
  partner: Pick<CommunityPartner, "phone" | "phones">
): string[] {
  return normalizePartnerPhones([...(partner.phones ?? []), partner.phone ?? ""]);
}

export function formListFromValues(values?: string[] | null, fallback?: string | null): string[] {
  const list = uniqueTrimmed([...(values ?? []), fallback ?? ""], false);
  return list.length > 0 ? list : [""];
}
