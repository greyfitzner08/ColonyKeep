import { NextRequest, NextResponse } from "next/server";
import { requireCommunityPartnerManager } from "@/lib/api/auth";
import {
  gcaaMemberIsActive,
  gcaaPartnershipStatus,
  isGcaaPartner,
  parseGcaaMemberStatus,
} from "@/lib/community-partners/constants";
import {
  contactFieldsFromPeople,
  normalizeContactInputs,
  normalizePartnerEmails,
  normalizePartnerPhones,
  type PartnerContactInput,
} from "@/lib/community-partners/contacts";
import { syncCommunityPartnerContacts } from "@/lib/community-partners/sync-contacts";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireCommunityPartnerManager();
  if (response) return response;

  const body = await request.json();
  const service = await createServiceClient();
  const contacts = normalizeContactInputs(
    (Array.isArray(body.contacts) ? body.contacts : []) as PartnerContactInput[]
  );
  const organizationType = body.organization_type ?? "other";
  const isGcaa = isGcaaPartner(organizationType);
  const fromPeople = contactFieldsFromPeople(contacts);
  const emails = isGcaa
    ? fromPeople.emails
    : normalizePartnerEmails(body.emails ?? body.email);
  const phones = isGcaa
    ? fromPeople.phones
    : normalizePartnerPhones(body.phones ?? body.phone);
  const memberStatus = isGcaa ? parseGcaaMemberStatus(body.gcaa_member_status) : null;
  const isActive = isGcaa
    ? memberStatus
      ? gcaaMemberIsActive(memberStatus)
      : true
    : Boolean(body.is_active ?? true);

  const payload = {
    name: String(body.name ?? "").trim(),
    organization_type: organizationType,
    website: body.website?.trim() || null,
    address: body.address?.trim() || null,
    city: body.city?.trim() || null,
    state: body.state?.trim() || null,
    zip: body.zip?.trim() || null,
    emails,
    phones,
    phone: phones[0] ?? null,
    email: emails[0] ?? null,
    notes: body.notes?.trim() || null,
    partnership_status: isGcaa
      ? gcaaPartnershipStatus(memberStatus ?? "active")
      : (body.partnership_status ?? "active"),
    gcaa_member_status: memberStatus,
    is_active: isActive,
  };

  if (!payload.name) {
    return NextResponse.json(
      { error: isGcaa ? "Apartment community name is required" : "Organization name is required" },
      { status: 400 }
    );
  }

  const query = body.id
    ? service.from("community_partners").update(payload).eq("id", body.id)
    : service.from("community_partners").insert(payload);

  const { data, error } = await query.select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await syncCommunityPartnerContacts(service, data.id, contacts);
  } catch (syncError) {
    return NextResponse.json(
      { error: syncError instanceof Error ? syncError.message : "Unable to save contacts" },
      { status: 400 }
    );
  }

  const { data: partner, error: loadError } = await service
    .from("community_partners")
    .select("*, community_partner_contacts(*)")
    .eq("id", data.id)
    .single();

  if (loadError) {
    return NextResponse.json({ partner: data });
  }

  return NextResponse.json({
    partner: {
      ...partner,
      contacts: partner.community_partner_contacts ?? [],
    },
  });
}
