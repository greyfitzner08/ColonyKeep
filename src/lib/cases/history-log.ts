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
    follow_up_completed: asBoolean(entry.follow_up_completed),
    follow_up_completed_at:
      entry.follow_up_completed_at == null || entry.follow_up_completed_at === ""
        ? undefined
        : String(entry.follow_up_completed_at),
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
  return activeFollowUpNotes(raw).length > 0;
}

export function activeFollowUpNotes(raw: unknown): HistoryEntry[] {
  return staffNotesFromHistory(raw).filter(
    (entry) => entry.follow_up && !entry.follow_up_completed
  );
}

export function resolveFollowUpInHistory(
  raw: unknown,
  target?: { id?: string; timestamp?: string }
): HistoryEntry[] {
  const log = normalizeHistoryLog(raw);
  const now = new Date().toISOString();

  return log.map((entry) => {
    if (!entry.follow_up || entry.follow_up_completed) {
      return entry;
    }

    const matchesTarget = target
      ? (target.id && entry.id === target.id) ||
        (!target.id &&
          target.timestamp &&
          entry.timestamp === target.timestamp &&
          entry.action === "note")
      : true;

    if (!matchesTarget) {
      return entry;
    }

    return {
      ...entry,
      follow_up_completed: true,
      follow_up_completed_at: now,
    };
  });
}

export function hasActiveFollowUpDueDate(followUpDueDate: string | null | undefined): boolean {
  if (!followUpDueDate) return false;
  const due = new Date(followUpDueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due < new Date();
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
