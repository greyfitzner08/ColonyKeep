import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeContactInputs,
  partnerHasContactDetails,
  type PartnerContactInput,
} from "@/lib/community-partners/contacts";

export async function syncCommunityPartnerContacts(
  service: SupabaseClient,
  partnerId: string,
  contacts: PartnerContactInput[]
) {
  const normalized = normalizeContactInputs(contacts);

  const { error: deleteError } = await service
    .from("community_partner_contacts")
    .delete()
    .eq("partner_id", partnerId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (normalized.length === 0) return;

  const payload = normalized.map((contact, index) => ({
    partner_id: partnerId,
    name: contact.name.trim() || null,
    title: contact.title.trim() || null,
    email: contact.email.trim() || null,
    phone: contact.phone.trim() || null,
    notes: contact.notes.trim() || null,
    is_primary: contact.is_primary,
    sort_order: index,
  }));

  const { error: insertError } = await service.from("community_partner_contacts").insert(payload);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export function contactFromImportRow(row: Record<string, string>) {
  const contact = {
    name: row.contact_name ?? "",
    title: row.contact_title ?? "",
    email: row.contact_email ?? "",
    phone: row.contact_phone ?? "",
    notes: row.contact_notes ?? "",
    is_primary: false,
  };

  return partnerHasContactDetails(contact) ? contact : null;
}
