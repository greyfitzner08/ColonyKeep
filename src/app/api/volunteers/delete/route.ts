import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { applicationId } = body as { applicationId?: string };

  if (!applicationId) {
    return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service
    .from("volunteer_applications")
    .delete()
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
