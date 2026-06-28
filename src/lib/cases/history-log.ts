import type { HistoryEntry, HistoryNoteColor } from "@/lib/types";

const NOTE_COLORS = new Set<HistoryNoteColor>([
  "default",
  "amber",
  "blue",
  "green",
  "red",
]);

function asBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function asNoteColor(value: unknown): HistoryNoteColor {
  const color = String(value ?? "default") as HistoryNoteColor;
  return NOTE_COLORS.has(color) ? color : "default";
}

export function normalizeHistoryEntry(raw: unknown): HistoryEntry {
  const entry = (raw ?? {}) as Record<string, unknown>;

  return {
    id: typeof entry.id === "string" ? entry.id : undefined,
    timestamp: String(entry.timestamp ?? new Date().toISOString()),
    action: String(entry.action ?? "note"),
    actor_email:
      entry.actor_email == null || entry.actor_email === ""
        ? null
        : String(entry.actor_email),
    actor_name:
      entry.actor_name == null || entry.actor_name === ""
        ? null
        : String(entry.actor_name),
    details: entry.details == null ? null : String(entry.details),
    highlighted: asBoolean(entry.highlighted),
    follow_up: asBoolean(entry.follow_up),
    text_color: asNoteColor(entry.text_color),
  };
}

export function normalizeHistoryLog(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeHistoryEntry);
}

export function staffNotesFromHistory(raw: unknown): HistoryEntry[] {
  return normalizeHistoryLog(raw).filter((entry) => entry.action === "note");
}

export function staffNotesText(raw: unknown): string {
  return staffNotesFromHistory(raw)
    .map((entry) => entry.details?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
}

export function hasFollowUpNote(raw: unknown): boolean {
  return staffNotesFromHistory(raw).some((entry) => entry.follow_up);
}

export function buildHistoryNoteEntry(input: {
  text: string;
  highlighted: boolean;
  follow_up: boolean;
  text_color: HistoryNoteColor;
  actor_name: string;
  actor_email: string;
}): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action: "note",
    actor_email: input.actor_email || null,
    actor_name: input.actor_name || null,
    details: input.text.trim(),
    highlighted: input.highlighted,
    follow_up: input.follow_up,
    text_color: input.text_color,
  };
}
