import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  backfillUnmappedHotspotColonies,
  countUnmappedHotspotColonies,
} from "@/lib/help-requests/geocode-backfill";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

export async function GET() {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Server admin configuration required." }, { status: 503 });
  }

  const service = await createServiceClient();
  const stats = await countUnmappedHotspotColonies(service);

  return NextResponse.json(stats);
}

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Server admin configuration required." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.min(Math.max(body.limit, 1), 30)
      : 20;
  const startAfterId =
    typeof body.startAfterId === "string" && body.startAfterId.trim()
      ? body.startAfterId.trim()
      : null;

  const service = await createServiceClient();
  const result = await backfillUnmappedHotspotColonies(service, { limit, startAfterId });

  return NextResponse.json(result);
}
