export interface HelpRequestOption {
  id: string;
  case_number: string;
  contact_name: string;
}

export function filterHelpRequestOptions(
  options: HelpRequestOption[],
  query: string
): HelpRequestOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, 12);

  return options
    .filter(
      (hr) =>
        hr.case_number.toLowerCase().includes(q) ||
        hr.contact_name.toLowerCase().includes(q)
    )
    .slice(0, 12);
}

export function formatHelpRequestLabel(hr: HelpRequestOption) {
  return `${hr.case_number} — ${hr.contact_name}`;
}
