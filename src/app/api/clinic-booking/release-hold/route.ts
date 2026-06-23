import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sessionId = body.session_id as string | undefined;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service
    .from("public_bookings")
    .update({ status: "expired" })
    .eq("hold_session_id", sessionId)
    .eq("status", "pending")
    .eq("contact_email", "hold@pending.local");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
