import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  buildVolunteerImportPreview,
  resolveVolunteerImportGroup,
  type VolunteerImportDuplicateAction,
  type VolunteerImportExistingSummary,
} from "@/lib/volunteers/import-duplicate";
import { parseVolunteerImportCsvWithCatalog } from "@/lib/volunteers/import-csv";
import {
  buildVolunteerImportMappingPreview,
  mappingIssuesRemain,
  materializeVolunteerImportRoleResolutions,
  parseVolunteerImportColumnResolutions,
  parseVolunteerImportRoleResolutions,
} from "@/lib/volunteers/import-mapping";
import { createServiceClient } from "@/lib/supabase/server";

const DUPLICATE_ACTIONS = new Set<VolunteerImportDuplicateAction>([
  "skip",
  "replace",
  "merge_import",
  "merge_keep_existing",
]);

function parseResolutions(
  value: unknown
): Record<string, VolunteerImportDuplicateAction> {
  if (!value || typeof value !== "object") return {};
  const resolutions: Record<string, VolunteerImportDuplicateAction> = {};
  for (const [email, action] of Object.entries(value as Record<string, unknown>)) {
    if (typeof action === "string" && DUPLICATE_ACTIONS.has(action as VolunteerImportDuplicateAction)) {
      resolutions[email.toLowerCase()] = action as VolunteerImportDuplicateAction;
    }
  }
  return resolutions;
}

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const csvText = typeof body.csvText === "string" ? body.csvText : "";
  const resolutions = parseResolutions(body.resolutions);
  let roleResolutions = parseVolunteerImportRoleResolutions(body.roleResolutions);
  const columnResolutions = parseVolunteerImportColumnResolutions(body.columnResolutions);

  const service = await createServiceClient();

  const materialized = await materializeVolunteerImportRoleResolutions(service, roleResolutions);
  if (materialized.errors.length > 0) {
    return NextResponse.json({ error: materialized.errors.join("; ") }, { status: 400 });
  }
  roleResolutions = materialized.resolutions;

  const { catalog, parsedRows } = await parseVolunteerImportCsvWithCatalog(service, csvText, {
    roleResolutions,
    columnResolutions,
  });

  if (!parsedRows.length) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const mapping = buildVolunteerImportMappingPreview(
    csvText,
    catalog,
    columnResolutions,
    roleResolutions
  );

  if (mappingIssuesRemain(mapping)) {
    return NextResponse.json(
      {
        error: "Unmapped CSV values require resolution before import.",
        needsMappingResolution: true,
        mapping,
      },
      { status: 409 }
    );
  }

  const emails = Array.from(
    new Set(
      parsedRows
        .map((entry) => entry.record?.email.toLowerCase())
        .filter((email): email is string => Boolean(email))
    )
  );

  const existingByEmail = new Map<string, VolunteerImportExistingSummary>();

  if (emails.length > 0) {
    const { data: existingRows, error } = await service
      .from("volunteer_applications")
      .select(
        "id, full_name, email, phone, birthday, status, roles_requested, why_volunteer, prior_experience, how_heard, liability_waiver_signed, policy_signed, tnvr_certificate_uploaded, admin_notes"
      )
      .in("email", emails);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const row of existingRows ?? []) {
      existingByEmail.set(String(row.email).toLowerCase(), row as VolunteerImportExistingSummary);
    }
  }

  const preview = buildVolunteerImportPreview(parsedRows, existingByEmail);
  const imported: { email: string; full_name: string }[] = [];
  const errors = [...preview.errors];

  if (preview.duplicateGroups.length > 0 && Object.keys(resolutions).length === 0) {
    return NextResponse.json(
      {
        error: "Duplicate emails require resolution before import.",
        duplicateEmails: preview.duplicateGroups.map((group) => group.email),
        needsResolution: true,
      },
      { status: 409 }
    );
  }

  for (const group of preview.duplicateGroups) {
    const action = resolutions[group.email] ?? group.suggestedAction;

    const resolved = resolveVolunteerImportGroup(group, action);
    if (!resolved.apply || !resolved.record) continue;

    if (resolved.existingId) {
      const { error } = await service
        .from("volunteer_applications")
        .update({
          ...resolved.record,
          imported_via_csv: true,
        })
        .eq("id", resolved.existingId);

      if (error) {
        errors.push({
          row: group.importRows[0]?.row ?? 0,
          error: `${group.email}: ${error.message}`,
        });
        continue;
      }
    } else {
      const { error } = await service.from("volunteer_applications").insert({
        ...resolved.record,
        imported_via_csv: true,
      });

      if (error) {
        errors.push({
          row: group.importRows[0]?.row ?? 0,
          error: `${group.email}: ${error.message}`,
        });
        continue;
      }
    }

    imported.push({
      email: resolved.record.email,
      full_name: resolved.record.full_name,
    });
  }

  for (const entry of preview.uniqueRows) {
    if (!entry.record) continue;

    const { error } = await service.from("volunteer_applications").insert({
      ...entry.record,
      imported_via_csv: true,
    });

    if (error) {
      errors.push({ row: entry.row, error: error.message });
      continue;
    }

    imported.push({
      email: entry.record.email,
      full_name: entry.record.full_name,
    });
  }

  return NextResponse.json({
    success: errors.length === 0,
    imported: imported.length,
    volunteers: imported,
    errors,
  });
}
