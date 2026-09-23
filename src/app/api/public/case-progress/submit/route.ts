import { NextRequest, NextResponse } from "next/server";
import {
  appendPublicProgressHistory,
  applyPublicOutcomeDeltas,
  buildPublicProgressHistoryEntry,
  caseNumberLookupValues,
  findCaseForPublicProgress,
  parsePublicOutcomeDeltas,
  PUBLIC_PROGRESS_SELECT,
  type PublicProgressCaseRow,
} from "@/lib/cases/public-progress-update";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Case updates are temporarily unavailable." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const caseNumber = typeof body.case_number === "string" ? body.case_number : "";
  const zip = typeof body.colony_zip === "string" ? body.colony_zip : "";
  const street =
    typeof body.colony_street === "string"
      ? body.colony_street
      : typeof body.street === "string"
        ? body.street
        : "";
  const actorName = typeof body.your_name === "string" ? body.your_name : "";
  const notes = typeof body.notes === "string" ? body.notes : "";

  const deltas = parsePublicOutcomeDeltas(body as Record<string, unknown>);
  if ("error" in deltas) {
    return NextResponse.json({ error: deltas.error }, { status: 400 });
  }

  const lookupValues = caseNumberLookupValues(caseNumber);
  if (lookupValues.length === 0) {
    return NextResponse.json({ error: "Enter a case number." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from("help_requests")
    .select(PUBLIC_PROGRESS_SELECT)
    .in("case_number", lookupValues);

  if (error) {
    return NextResponse.json({ error: "Unable to look up that case." }, { status: 400 });
  }

  const found = findCaseForPublicProgress({
    caseNumber,
    zip,
    street,
    rows: (data ?? []) as PublicProgressCaseRow[],
  });

  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }

  const applied = applyPublicOutcomeDeltas(found.row, deltas);
  if ("error" in applied) {
    return NextResponse.json({ error: applied.error }, { status: 400 });
  }

  const historyEntry = buildPublicProgressHistoryEntry({
    details: applied.historyDetails,
    actorName,
    notes,
  });
  const history_log = appendPublicProgressHistory(found.row.history_log, historyEntry);

  const { error: updateError } = await service
    .from("help_requests")
    .update({
      ...applied.update,
      history_log,
    })
    .eq("id", found.row.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    case: applied.summary,
  });
}
