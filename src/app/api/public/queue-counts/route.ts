import { NextResponse } from "next/server";
import { queuedCatCount, PUBLIC_QUEUE_STATUSES } from "@/lib/cases/public-queue-counts";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;

export async function GET() {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Queue totals are temporarily unavailable." },
      { status: 503 }
    );
  }

  const service = await createServiceClient();
  let cases = 0;
  let cats = 0;
  let from = 0;

  for (;;) {
    const { data, error } = await service
      .from("help_requests")
      .select("cats_remaining, cats_over_8_weeks, kittens_under_8_weeks")
      .in("status", [...PUBLIC_QUEUE_STATUSES])
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: "Unable to load the queue." }, { status: 500 });
    }

    const rows = data ?? [];
    cases += rows.length;
    for (const row of rows) {
      cats += queuedCatCount(row);
    }
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return NextResponse.json(
    { cases, cats },
    { headers: { "Cache-Control": "no-store" } }
  );
}
