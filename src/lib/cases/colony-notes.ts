import type { HelpRequest } from "@/lib/types";

const STRUCTURED_NOTE_PREFIXES = [
  /^relationship to cats:/i,
  /^trapping experience:/i,
  /^feeder if not reporter:/i,
  /^apartment\/community:/i,
  /^trapper\/trap loaner:/i,
  /^resolution:/i,
  /^additional notes:/i,
];

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Legacy imports merged structured fields into intake_notes — strip those for the notes section. */
export function displayColonyNotes(
  intakeNotes: string | null | undefined,
  hr: HelpRequest
): string | null {
  if (!intakeNotes?.trim()) return null;

  const knownValues = new Set(
    [
      hr.relationship_to_cats,
      hr.trapping_experience,
      hr.feeder_if_not,
      hr.apartment_name,
      hr.trapper_trap_loaner,
      hr.resolution,
      hr.additional_notes,
      hr.willing_to_trap_transport,
      hr.able_to_trap_transport,
    ]
      .filter(Boolean)
      .map((value) => normalizeText(String(value)))
  );

  const paragraphs = intakeNotes.split(/\n\n+/);
  const filtered = paragraphs
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .filter((part) => !STRUCTURED_NOTE_PREFIXES.some((pattern) => pattern.test(part)))
    .filter((part) => {
      const normalized = normalizeText(part);
      if (knownValues.has(normalized)) return false;

      for (const known of knownValues) {
        if (known.length > 8 && normalized.includes(known)) return false;
      }

      return true;
    });

  return filtered.join("\n\n").trim() || null;
}

export function displayContactName(hr: HelpRequest): string {
  return hr.contact_name?.trim() || "—";
}

export function formatSingleLineAddress(parts: Array<string | null | undefined>): string | null {
  const line1 = parts[0]?.trim();
  const locality = [parts[1], parts[2], parts[3]].filter(Boolean).join(", ");
  const county = parts[4]?.trim();

  const segments = [line1, locality, county ? `${county} County` : null].filter(Boolean);
  return segments.join(" · ") || null;
}
