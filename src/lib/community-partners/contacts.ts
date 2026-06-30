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
