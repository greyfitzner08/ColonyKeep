import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

const PAGE_SIZE = 80;

function safeSearch(value: string) {
  return value.replace(/[%_,.()]/g, " ").trim().slice(0, 80);
}

export async function GET(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const source = request.nextUrl.searchParams.get("source");
  const before = request.nextUrl.searchParams.get("before");
  const search = safeSearch(request.nextUrl.searchParams.get("q") ?? "");

  const service = await createServiceClient();
  let query = service
    .from("audit_events")
    .select(
      "id, occurred_at, actor_email, actor_name, method, path, summary, source, entity_type, entity_id"
    )
    .order("occurred_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (source === "api" || source === "login") {
    query = query.eq("source", source);
  }
  query = query
    .neq("source", "case_history")
    .not("path", "like", "/case/%")
    .not("path", "like", "/api/help-requests%")
    .not("path", "like", "/api/cats%")
    .not("path", "like", "/api/appointments%")
    .not("path", "like", "/api/public/case-progress%");
  if (before) {
    query = query.lt("occurred_at", before);
  }
  if (search) {
    query = query.or(
      `actor_email.ilike.%${search}%,actor_name.ilike.%${search}%,summary.ilike.%${search}%,path.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const events = data ?? [];
  return NextResponse.json({
    events,
    nextBefore: events.length === PAGE_SIZE ? events[events.length - 1]?.occurred_at ?? null : null,
  });
}
