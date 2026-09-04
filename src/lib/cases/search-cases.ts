import type { HelpRequest } from "@/lib/types";

function matchesCaseSearch(hr: HelpRequest, q: string): boolean {
  // Case # is the most common search — check it first without building a haystack.
  if (hr.case_number.toLowerCase().includes(q)) return true;

  const fields = [
    hr.contact_name,
    hr.contact_first_name,
    hr.contact_last_name,
    hr.contact_email,
    hr.contact_phone,
    hr.contact_street,
    hr.contact_city,
    hr.contact_state,
    hr.contact_zip,
    hr.contact_county,
    hr.colony_address,
    hr.colony_city,
    hr.colony_state,
    hr.colony_zip,
    hr.colony_county,
    hr.assigned_team_name,
    hr.claimed_by_name,
    hr.claimed_by_email,
  ];

  for (const field of fields) {
    if (field && field.toLowerCase().includes(q)) return true;
  }
  return false;
}

export function filterCasesBySearch(cases: HelpRequest[], query: string): HelpRequest[] {
  const q = query.trim().toLowerCase();
  if (!q) return cases;
  return cases.filter((hr) => matchesCaseSearch(hr, q));
}
