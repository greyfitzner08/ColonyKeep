import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { buildHistoryNoteEntry, normalizeHistoryLog } from "@/lib/cases/history-log";
import { createServiceClient } from "@/lib/supabase/server";
import type { HistoryNoteColor } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireCaseWorker();
  if (response) return response;

  const body = await request.json();
  const helpRequestId = body.help_request_id as string | undefined;
  const text = String(body.text ?? "").trim();

  if (!helpRequestId || !text) {
    return NextResponse.json({ error: "Missing help_request_id or note text" }, { status: 400 });
  }

  const highlighted = body.highlighted === true;
  const follow_up = body.follow_up === true;
  const text_color = (body.text_color ?? "default") as HistoryNoteColor;

  const service = await createServiceClient();
  const { data: existing, error: loadError } = await service
    .from("help_requests")
    .select("history_log")
    .eq("id", helpRequestId)
    .single();

  if (loadError || !existing) {
    return NextResponse.json(
      { error: loadError?.message ?? "Case not found" },
      { status: loadError ? 400 : 404 }
    );
  }

  const entry = buildHistoryNoteEntry({
    text,
    highlighted,
    follow_up,
    text_color,
    actor_name: profile!.full_name ?? profile!.email ?? "Team member",
    actor_email: profile!.email ?? "",
  });

  const history_log = [...normalizeHistoryLog(existing.history_log), entry];

  const { error: updateError } = await service
    .from("help_requests")
    .update({ history_log })
    .eq("id", helpRequestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ entry, history_log });
}
