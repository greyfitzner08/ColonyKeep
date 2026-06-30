import { NextRequest, NextResponse } from "next/server";
import { requireCommunityPartnerManager } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireCommunityPartnerManager();
  if (response) return response;

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "";

  if (!id) {
    return NextResponse.json({ error: "Partner id is required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service.from("community_partners").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
