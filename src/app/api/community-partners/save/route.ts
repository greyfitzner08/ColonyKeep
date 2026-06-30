import { NextRequest, NextResponse } from "next/server";
import { requireCommunityPartnerManager } from "@/lib/api/auth";
import {
  normalizeContactInputs,
  type PartnerContactInput,
} from "@/lib/community-partners/contacts";
import { syncCommunityPartnerContacts } from "@/lib/community-partners/sync-contacts";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireCommunityPartnerManager();
  if (response) return response;

  const body = await request.json();
  const service = await createServiceClient();

  const payload = {
    name: String(body.name ?? "").trim(),
    organization_type: body.organization_type ?? "other",
    website: body.website?.trim() || null,
    address: body.address?.trim() || null,
    city: body.city?.trim() || null,
    state: body.state?.trim() || null,
    zip: body.zip?.trim() || null,
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    notes: body.notes?.trim() || null,
    partnership_status: body.partnership_status ?? "active",
    is_active: body.is_active ?? true,
  };

  if (!payload.name) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  const contacts = normalizeContactInputs(
    (Array.isArray(body.contacts) ? body.contacts : []) as PartnerContactInput[]
  );

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
