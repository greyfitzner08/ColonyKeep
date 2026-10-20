import type { CommunityPartner, CommunityPartnerContact } from "@/lib/types";

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
}): boolean {
  return Boolean(
    contact.name?.trim() ||
      contact.title?.trim() ||
      contact.email?.trim() ||
      contact.phone?.trim() ||
      contact.notes?.trim()
  );
}

export interface PartnerContactInput {
  id?: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  notes: string;
  is_primary: boolean;
}

export const emptyPartnerContactInput = (): PartnerContactInput => ({
  name: "",
  title: "",
  email: "",
  phone: "",
  notes: "",
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
