import type { SupabaseClient } from "@supabase/supabase-js";
import { type BirthdayPerson } from "@/lib/team-feed/birthdays";

function nestedPartnerName(value: unknown): string | null {
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object" && "name" in first) {
      const name = (first as { name?: unknown }).name;
      return typeof name === "string" ? name.trim() || null : null;
    }
    return null;
  }
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name.trim() || null : null;
  }
  return null;
}

export async function loadBirthdayPeople(service: SupabaseClient): Promise<BirthdayPerson[]> {
  const [{ data: profiles }, { data: partnerContacts }] = await Promise.all([
    service
      .from("profiles")
      .select("full_name, birthday")
      .not("birthday", "is", null)
      .not("full_name", "is", null),
    service
      .from("community_partner_contacts")
      .select("name, birthday, community_partners(name)")
      .not("birthday", "is", null)
      .not("name", "is", null),
  ]);

  const volunteers: BirthdayPerson[] = (profiles ?? [])
    .filter((person) => person.full_name && person.birthday)
    .map((person) => ({
      full_name: person.full_name as string,
      birthday: person.birthday as string,
      source: "volunteer" as const,
    }));

  const partners: BirthdayPerson[] = (partnerContacts ?? [])
    .filter((contact) => contact.name && contact.birthday)
    .map((contact) => ({
      full_name: contact.name as string,
      birthday: contact.birthday as string,
      organization: nestedPartnerName(contact.community_partners),
      source: "partner" as const,
    }));

  return [...volunteers, ...partners].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" })
  );
}
