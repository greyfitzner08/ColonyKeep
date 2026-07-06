import type { SupabaseClient } from "@supabase/supabase-js";
import type { VolunteerImportColumnResolution } from "@/lib/volunteers/import-mapper";
import {
  createVolunteerImportRoleMatcher,
  type VolunteerImportRoleResolution,
} from "@/lib/volunteers/import-role-matcher";
import { fetchVolunteerRoleCatalogInputs } from "@/lib/volunteers/load-role-catalog";
import { parseVolunteerImportCsv } from "@/lib/volunteers/import-duplicate";

export async function parseVolunteerImportCsvWithCatalog(
  service: SupabaseClient,
  csvText: string,
  options?: {
    roleResolutions?: Record<string, VolunteerImportRoleResolution>;
    columnResolutions?: Record<string, VolunteerImportColumnResolution>;
  }
) {
  const { catalog } = await fetchVolunteerRoleCatalogInputs(service);
  const roleResolutions = options?.roleResolutions ?? {};
  const columnResolutions = options?.columnResolutions ?? {};
  const roleMatcher = createVolunteerImportRoleMatcher(catalog, roleResolutions);
  return {
    catalog,
    roleMatcher,
    parsedRows: parseVolunteerImportCsv(
      csvText,
      roleMatcher,
      roleResolutions,
      columnResolutions
    ),
  };
}
