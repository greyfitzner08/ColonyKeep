import type { HelpRequest } from "@/lib/types";

/** Legacy imports merged structured fields into intake_notes — strip those for the notes section. */
const STRUCTURED_NOTE_PREFIXES = [
  /^relationship to cats:/i,
  /^trapping experience:/i,
  /^feeder if not reporter:/i,
  /^apartment\/community:/i,
  /^trapper\/trap loaner:/i,
  /^resolution:/i,
  /^additional notes:/i,
];

export function displayColonyNotes(intakeNotes: string | null | undefined): string | null {
  if (!intakeNotes?.trim()) return null;

  const paragraphs = intakeNotes.split(/\n\n+/);
  const filtered = paragraphs
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .filter((part) => !STRUCTURED_NOTE_PREFIXES.some((pattern) => pattern.test(part)));

  return filtered.join("\n\n").trim() || null;
}

export function displayContactName(hr: HelpRequest): string {
  return hr.contact_name?.trim() || "—";
}
