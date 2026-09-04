import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const ids = Array.isArray(body.ids)
    ? body.ids.map((id: unknown) => String(id).trim()).filter(Boolean)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No shifts selected to delete" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service.from("shifts").delete().in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, deleted: ids.length });
}
