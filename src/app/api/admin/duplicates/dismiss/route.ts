import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  duplicatePairKeysForIds,
  parseDuplicatePairKey,
  type DismissedDuplicateEntityType,
} from "@/lib/admin/dismissed-duplicates";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const entityType = body?.entityType as DismissedDuplicateEntityType | undefined;
  const ids = Array.isArray(body?.ids)
    ? (body.ids as unknown[]).map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];

  if (entityType !== "profile" && entityType !== "application") {
    return NextResponse.json(
      { error: "entityType must be “profile” or “application”." },
      { status: 400 }
    );
  }
  if (ids.length < 2) {
    return NextResponse.json(
      { error: "Select at least two records to mark as not duplicates." },
      { status: 400 }
    );
  }

  const pairKeys = duplicatePairKeysForIds(ids);
  if (pairKeys.length === 0) {
    return NextResponse.json({ error: "No pairs to dismiss." }, { status: 400 });
  }

  const rows = pairKeys
    .map((key) => parseDuplicatePairKey(key))
    .filter((pair): pair is { leftId: string; rightId: string } => Boolean(pair))
    .map((pair) => ({
      entity_type: entityType,
      left_id: pair.leftId,
      right_id: pair.rightId,
      dismissed_by: profile?.id ?? null,
    }));

  const service = await createServiceClient();
  const { error } = await service.from("dismissed_duplicate_pairs").upsert(rows, {
    onConflict: "entity_type,left_id,right_id",
    ignoreDuplicates: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, dismissedPairs: rows.length });
}
