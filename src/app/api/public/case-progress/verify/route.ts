import { NextRequest, NextResponse } from "next/server";
import {
  caseNumberLookupValues,
  findCaseForPublicProgress,
  PUBLIC_PROGRESS_SELECT,
  toPublicProgressSummary,
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

  const result = findCaseForPublicProgress({
    caseNumber,
    zip,
    street,
    rows: (data ?? []) as PublicProgressCaseRow[],
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    verified: true,
    case: toPublicProgressSummary(result.row),
  });
}
