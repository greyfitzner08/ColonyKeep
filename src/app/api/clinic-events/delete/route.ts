import { NextRequest, NextResponse } from "next/server";
import { requireClinicManager } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireClinicManager();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const id =
    body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id.trim()
      : "";

  if (!id) {
    return NextResponse.json({ error: "Event id is required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service.from("public_clinic_events").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
