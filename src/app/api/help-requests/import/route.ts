import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { detectMedicalKeywords } from "@/lib/medical-flags";
import type { HelpRequestStatus } from "@/lib/types";

const REQUIRED_FIELDS = [
  "contact_name",
  "contact_email",
  "contact_phone",
  "colony_address",
  "colony_city",
  "colony_county",
  "colony_zip",
] as const;

const VALID_STATUSES = new Set<HelpRequestStatus>([
  "new_intake",
  "under_review",
  "needs_more_info",
  "routed_to_trap_team",
]);

function parseInteger(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRow(row: Record<string, unknown>, actorEmail: string):
  | { error: string }
  | { record: Record<string, unknown> } {
  const missing = REQUIRED_FIELDS.filter((field) => !String(row[field] ?? "").trim());
  if (missing.length > 0) {
    return { error: `Missing required fields: ${missing.join(", ")}` };
  }

  const intakeNotes = String(row.intake_notes ?? row.notes ?? "").trim();
  const status = String(row.status ?? "new_intake").trim() as HelpRequestStatus;
  if (!VALID_STATUSES.has(status)) {
    return { error: `Invalid status "${status}"` };
  }

  return {
    record: {
      status,
      contact_name: String(row.contact_name).trim(),
      contact_email: String(row.contact_email).trim().toLowerCase(),
      contact_phone: String(row.contact_phone).trim(),
      colony_address: String(row.colony_address).trim(),
      colony_city: String(row.colony_city).trim(),
      colony_county: String(row.colony_county).trim(),
      colony_zip: String(row.colony_zip).trim(),
      kittens_under_8_weeks: parseInteger(row.kittens_under_8_weeks),
      cats_over_8_weeks: parseInteger(row.cats_over_8_weeks),
      can_help: String(row.can_help ?? "").toLowerCase() === "true",
      has_traps: String(row.has_traps ?? "").toLowerCase() === "true",
      can_transport: String(row.can_transport ?? "").toLowerCase() === "true",
      has_recovery_space: String(row.has_recovery_space ?? "").toLowerCase() === "true",
      consent_communications: String(row.consent_communications ?? "true").toLowerCase() !== "false",
      intake_notes: intakeNotes || null,
      medical_flags: detectMedicalKeywords(intakeNotes),
      history_log: [
        {
          timestamp: new Date().toISOString(),
          action: "imported",
          actor_email: actorEmail,
          actor_name: actorEmail,
          details: "Imported from CSV",
        },
      ],
    },
  };
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const rows = body.rows as Record<string, unknown>[] | undefined;

  if (!rows?.length) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const service = await createServiceClient();
  const created: { case_number: string }[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const normalized = normalizeRow(rows[index], profile!.email);
    if ("error" in normalized) {
      errors.push({ row: index + 2, error: normalized.error });
      continue;
    }

    const { data, error } = await service
      .from("help_requests")
      .insert(normalized.record)
      .select("case_number")
      .single();

    if (error) {
      errors.push({ row: index + 2, error: error.message });
      continue;
    }

    created.push({ case_number: data.case_number });
  }

  return NextResponse.json({
    success: errors.length === 0,
    imported: created.length,
    caseNumbers: created.map((entry) => entry.case_number),
    errors,
  });
}
