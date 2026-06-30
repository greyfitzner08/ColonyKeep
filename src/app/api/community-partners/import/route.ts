import { NextRequest, NextResponse } from "next/server";
import { requireCommunityPartnerManager } from "@/lib/api/auth";
import { mapCommunityPartnerImportRow } from "@/lib/community-partners/import-mapper";
import { syncCommunityPartnerContacts } from "@/lib/community-partners/sync-contacts";
import { parseCsv } from "@/lib/csv";
import { createServiceClient } from "@/lib/supabase/server";

async function findPartnerByName(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  name: string
) {
  const { data } = await service
    .from("community_partners")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  return data;
}

export async function POST(request: NextRequest) {
  const { response } = await requireCommunityPartnerManager();
  if (response) return response;

  const body = await request.json();
  const csvText = typeof body.csvText === "string" ? body.csvText : "";
  const rows = parseCsv(csvText.replace(/^\uFEFF/, "").trim());

  if (!rows.length) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const service = await createServiceClient();
  let importedPartners = 0;
  let importedContacts = 0;
  const errors: { row: number; error: string }[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const mapped = mapCommunityPartnerImportRow(rows[index]);
    if (mapped.error || !mapped.record) {
      errors.push({ row: index + 2, error: mapped.error ?? "Invalid row" });
      continue;
    }

    const { partner, contact } = mapped.record;
    let partnerId: string | null = null;

    const existing = await findPartnerByName(service, partner.name);
    if (existing) {
      partnerId = existing.id;
      const { error: updateError } = await service
        .from("community_partners")
        .update(partner)
        .eq("id", partnerId);
      if (updateError) {
        errors.push({ row: index + 2, error: updateError.message });
        continue;
      }
    } else {
      const { data: created, error: insertError } = await service
        .from("community_partners")
        .insert(partner)
        .select("id")
        .single();
      if (insertError || !created) {
        errors.push({ row: index + 2, error: insertError?.message ?? "Unable to create partner" });
        continue;
      }
      partnerId = created.id;
      importedPartners += 1;
    }

    if (contact && partnerId) {
      const { count } = await service
        .from("community_partner_contacts")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId);

      const shouldBePrimary = contact.is_primary || (count ?? 0) === 0;

      if (shouldBePrimary) {
        await service
          .from("community_partner_contacts")
          .update({ is_primary: false })
          .eq("partner_id", partnerId);
      }

      const { error: contactError } = await service.from("community_partner_contacts").insert({
        partner_id: partnerId,
        name: contact.name,
        title: contact.title,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes,
        is_primary: shouldBePrimary,
        sort_order: count ?? 0,
      });

      if (contactError) {
        errors.push({ row: index + 2, error: contactError.message });
        continue;
      }

      importedContacts += 1;
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    imported: importedPartners,
    imported_contacts: importedContacts,
    errors,
  });
}
