import type { HelpRequest } from "@/lib/types";

export function filterCasesBySearch(cases: HelpRequest[], query: string): HelpRequest[] {
  const q = query.trim().toLowerCase();
  if (!q) return cases;

  return cases.filter((hr) => {
    const haystack = [
      hr.case_number,
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
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}
