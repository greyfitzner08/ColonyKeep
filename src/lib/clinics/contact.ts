export function normalizeClinicEmails(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,;]+/)
      : [];

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const email = entry.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export function normalizeClinicWebsite(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function clinicWebsiteHref(website: string): string {
  const trimmed = website.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
