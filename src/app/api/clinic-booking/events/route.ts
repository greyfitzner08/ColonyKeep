import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const service = await createServiceClient();
  const today = new Date().toISOString().split("T")[0];
  const { data: events, error } = await service
    .from("public_clinic_events")
    .select("*")
    .eq("is_active", true)
    .gte("date", today)
    .order("date");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const counts: Record<string, number> = {};
  for (const event of events ?? []) {
    const { count, error: countError } = await service
      .from("public_bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .in("status", ["pending", "confirmed"]);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 });
    }

    counts[event.id] = count ?? 0;
  }

  return NextResponse.json({ events: events ?? [], counts });
}
