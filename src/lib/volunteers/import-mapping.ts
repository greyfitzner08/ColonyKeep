import { parseCsv } from "@/lib/csv";
import type { RoleDescription, VolunteerRole } from "@/lib/types";
import {
  IMPORT_FIELD_OPTIONS,
  normalizeVolunteerImportRow,
  type VolunteerImportColumnResolution,
  type VolunteerImportFieldKey,
} from "@/lib/volunteers/import-mapper";
import {
  createVolunteerImportRoleMatcher,
  normalizeVolunteerImportRoleToken,
  parseVolunteerImportRoles,
  tokenizeVolunteerImportRoles,
  type VolunteerImportRoleMatcher,
  type VolunteerImportRoleResolution,
} from "@/lib/volunteers/import-role-matcher";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createVolunteerRole } from "@/lib/volunteers/create-volunteer-role";

export type VolunteerImportMappingPreview = {
  unrecognizedRoles: Array<{ token: string; rowCount: number }>;
  unmappedColumns: string[];
  availableRoles: Array<{ role_id: VolunteerRole; label: string }>;
  importFieldOptions: Array<{ key: VolunteerImportFieldKey; label: string }>;
};

export function roleResolutionKey(token: string): string {
  return normalizeVolunteerImportRoleToken(token);
}

export function getVolunteerImportCsvHeaders(csvText: string): string[] {
  const rows = parseCsv(csvText.replace(/^\uFEFF/, "").trim());
  if (!rows.length) return [];
  return Object.keys(rows[0] ?? {});
}

export function detectUnmappedVolunteerImportColumns(
  csvText: string,
  columnResolutions: Record<string, VolunteerImportColumnResolution> = {}
): string[] {
  return getVolunteerImportCsvHeaders(csvText).filter((header) => {
    const resolution = columnResolutions[header];
    if (resolution) return false;

    const normalized = normalizeVolunteerImportRow({ [header]: "probe" });
    return Object.keys(normalized).length === 0;
  });
}

export function collectUnrecognizedVolunteerImportRoles(
  csvText: string,
  matcher: VolunteerImportRoleMatcher,
  roleResolutions: Record<string, VolunteerImportRoleResolution> = {},
  columnResolutions: Record<string, VolunteerImportColumnResolution> = {}
): Array<{ token: string; rowCount: number }> {
  const rows = parseCsv(csvText.replace(/^\uFEFF/, "").trim());
  const counts = new Map<string, number>();

  for (const raw of rows) {
    const row = normalizeVolunteerImportRow(raw, columnResolutions);
    const { unrecognized } = parseVolunteerImportRoles(
      row.roles_requested,
      matcher,
      roleResolutions
    );
    for (const token of unrecognized) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([token, rowCount]) => ({ token, rowCount }))
    .sort((a, b) => a.token.localeCompare(b.token));
}

export function buildVolunteerImportMappingPreview(
  csvText: string,
  catalog: RoleDescription[],
  columnResolutions: Record<string, VolunteerImportColumnResolution> = {},
  roleResolutions: Record<string, VolunteerImportRoleResolution> = {}
): VolunteerImportMappingPreview {
  const matcher = createVolunteerImportRoleMatcher(catalog, roleResolutions);

  return {
    unrecognizedRoles: collectUnrecognizedVolunteerImportRoles(
      csvText,
      matcher,
      roleResolutions,
      columnResolutions
    ),
    unmappedColumns: detectUnmappedVolunteerImportColumns(csvText, columnResolutions),
    availableRoles: catalog.map((entry) => ({
      role_id: entry.role_id,
      label: entry.label,
    })),
    importFieldOptions: IMPORT_FIELD_OPTIONS.map((entry) => ({ ...entry })),
  };
}

export function mappingIssuesRemain(preview: VolunteerImportMappingPreview): boolean {
  return preview.unrecognizedRoles.length > 0 || preview.unmappedColumns.length > 0;
}

export function parseVolunteerImportRoleResolutions(
  value: unknown
): Record<string, VolunteerImportRoleResolution> {
  if (!value || typeof value !== "object") return {};

  const resolutions: Record<string, VolunteerImportRoleResolution> = {};
  for (const [token, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const action = (entry as { action?: string }).action;
    if (action === "skip") {
      resolutions[roleResolutionKey(token)] = { action: "skip" };
      continue;
    }
    if (action === "map") {
      const roleId = (entry as { roleId?: string }).roleId?.trim();
      if (roleId) {
        resolutions[roleResolutionKey(token)] = { action: "map", roleId: roleId as VolunteerRole };
      }
      continue;
    }
    if (action === "create") {
      const label =
        typeof (entry as { label?: string }).label === "string"
          ? (entry as { label: string }).label.trim()
          : token;
      const description =
        typeof (entry as { description?: string }).description === "string"
          ? (entry as { description: string }).description.trim()
          : undefined;
      const roleId =
        typeof (entry as { roleId?: string }).roleId === "string"
          ? (entry as { roleId: string }).roleId.trim()
          : undefined;
      resolutions[roleResolutionKey(token)] = {
        action: "create",
        label: label || token,
        description,
        roleId,
      };
    }
  }

  return resolutions;
}

export function parseVolunteerImportColumnResolutions(
  value: unknown
): Record<string, VolunteerImportColumnResolution> {
  if (!value || typeof value !== "object") return {};

  const resolutions: Record<string, VolunteerImportColumnResolution> = {};
  for (const [header, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const action = (entry as { action?: string }).action;
    if (action === "ignore") {
      resolutions[header] = { action: "ignore" };
      continue;
    }
    if (action === "append_admin_notes") {
      resolutions[header] = { action: "append_admin_notes" };
      continue;
    }
    if (action === "map") {
      const field = (entry as { field?: string }).field?.trim();
      if (field) {
        resolutions[header] = { action: "map", field: field as VolunteerImportFieldKey };
      }
    }
  }

  return resolutions;
}

export async function materializeVolunteerImportRoleResolutions(
  service: SupabaseClient,
  roleResolutions: Record<string, VolunteerImportRoleResolution>
): Promise<{ resolutions: Record<string, VolunteerImportRoleResolution>; errors: string[] }> {
  const materialized: Record<string, VolunteerImportRoleResolution> = { ...roleResolutions };
  const errors: string[] = [];

  for (const [token, resolution] of Object.entries(roleResolutions)) {
    if (resolution.action !== "create") continue;

    const result = await createVolunteerRole(service, {
      label: resolution.label,
      description: resolution.description,
      roleId: resolution.roleId,
    });

    if (result.error) {
      errors.push(`${token}: ${result.error}`);
      continue;
    }

    materialized[token] = { action: "map", roleId: result.roleId };
  }

  return { resolutions: materialized, errors };
}
