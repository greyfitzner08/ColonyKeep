import type { SupabaseClient } from "@supabase/supabase-js";
import { createVolunteerImportRoleMatcher } from "@/lib/volunteers/import-role-matcher";
import { fetchVolunteerRoleCatalogInputs } from "@/lib/volunteers/load-role-catalog";
import { parseVolunteerImportCsv } from "@/lib/volunteers/import-duplicate";

export async function parseVolunteerImportCsvWithCatalog(
  service: SupabaseClient,
  csvText: string
) {
  const { catalog } = await fetchVolunteerRoleCatalogInputs(service);
  const roleMatcher = createVolunteerImportRoleMatcher(catalog);
  return {
    roleMatcher,
    parsedRows: parseVolunteerImportCsv(csvText, roleMatcher),
  };
}
