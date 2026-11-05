import { NextRequest, NextResponse } from "next/server";
import {
  findCaseByReporterNameAndZip,
  PUBLIC_PROGRESS_FIND_SELECT,
  toPublicProgressSummaryWithCounts,
  type PublicProgressFindCaseRow,
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

  const firstName =
    typeof body.first_name === "string"
      ? body.first_name
      : typeof body.firstName === "string"
        ? body.firstName
        : "";
  const lastName =
    typeof body.last_name === "string"
      ? body.last_name
      : typeof body.lastName === "string"
        ? body.lastName
        : "";
  const zip =
    typeof body.colony_zip === "string"
      ? body.colony_zip
      : typeof body.zip === "string"
        ? body.zip
        : "";

  if (!firstName.trim() || !lastName.trim() || !zip.trim()) {
    return NextResponse.json(
      { error: "Enter your first name, last name, and colony ZIP code." },
      { status: 400 }
    );
  }

  const zipDigits = zip.replace(/\D/g, "").slice(0, 5);
  if (zipDigits.length !== 5) {
    return NextResponse.json({ error: "Enter a valid 5-digit colony ZIP code." }, { status: 400 });
  }

  const service = await createServiceClient();
  // Narrow by ZIP prefix first so we don't scan the whole table; exact match is checked in-memory.
  const { data, error } = await service
    .from("help_requests")
    .select(PUBLIC_PROGRESS_FIND_SELECT)
    .or(`colony_zip.ilike.${zipDigits}%,contact_zip.ilike.${zipDigits}%`)
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Unable to look up that case." }, { status: 400 });
  }

  const result = findCaseByReporterNameAndZip({
    firstName,
    lastName,
    zip: zipDigits,
    rows: (data ?? []) as PublicProgressFindCaseRow[],
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    found: true,
    case: await toPublicProgressSummaryWithCounts(service, result.row),
    case_number: result.row.case_number,
    colony_zip: zipDigits,
  });
}
