import type { SupabaseClient } from "@supabase/supabase-js";
import { type BirthdayPerson } from "@/lib/team-feed/birthdays";

export async function loadBirthdayPeople(service: SupabaseClient): Promise<BirthdayPerson[]> {
  const [{ data: profiles }, contactsResult, partnersResult] = await Promise.all([
    service
      .from("profiles")
      .select("full_name, birthday")
      .not("birthday", "is", null)
      .not("full_name", "is", null),
    service
      .from("community_partner_contacts")
      .select("name, birthday, partner_id")
      .not("birthday", "is", null)
      .not("name", "is", null),
    service.from("community_partners").select("id, name"),
  ]);

  const organizationById = new Map(
    (partnersResult.data ?? []).map((partner) => [partner.id as string, String(partner.name ?? "").trim()])
  );

  const volunteers: BirthdayPerson[] = (profiles ?? [])
    .filter((person) => person.full_name && person.birthday)
    .map((person) => ({
      full_name: person.full_name as string,
      birthday: String(person.birthday).slice(0, 10),
      source: "volunteer" as const,
    }));

  const partners: BirthdayPerson[] = (contactsResult.data ?? [])
    .filter((contact) => contact.name && contact.birthday)
    .map((contact) => ({
      full_name: contact.name as string,
      birthday: String(contact.birthday).slice(0, 10),
      organization: organizationById.get(contact.partner_id as string) || null,
      source: "partner" as const,
    }));

  return [...volunteers, ...partners].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" })
  );
}
