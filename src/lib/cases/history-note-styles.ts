import type { HistoryEntry, HistoryNoteColor } from "@/lib/types";
import { cn } from "@/lib/utils";

export const HISTORY_NOTE_COLORS: { value: HistoryNoteColor; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "amber", label: "Amber" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "red", label: "Red" },
];

export const HISTORY_NOTE_SWATCH: Record<HistoryNoteColor, string> = {
  default: "bg-background border-2 border-muted-foreground/30",
  amber: "bg-amber-400 border-2 border-amber-500",
  blue: "bg-blue-500 border-2 border-blue-600",
  green: "bg-green-500 border-2 border-green-600",
  red: "bg-red-500 border-2 border-red-600",
};

export function historyEntryLabel(entry: HistoryEntry): string {
  if (entry.action === "note") return "Note";
  if (entry.action === "status_change") return "Status change";
  if (entry.action === "follow_up_completed") return "Follow-up completed";
  return entry.action.replace(/_/g, " ");
}

export function historyEntryBody(entry: HistoryEntry): string {
  return entry.details?.trim() || entry.action.replace(/_/g, " ");
}

export function historyEntryClasses(entry: HistoryEntry): string {
  const color = entry.text_color ?? "default";

  return cn(
    "rounded-md border px-3 py-2 text-sm leading-relaxed",
    entry.highlighted && "ring-2 ring-amber-400/80 shadow-sm",
    entry.follow_up && !entry.follow_up_completed && "border-orange-400",
    color === "default" && "bg-card",
    color === "amber" && "border-amber-300 bg-amber-50 text-amber-950",
    color === "blue" && "border-blue-300 bg-blue-50 text-blue-950",
    color === "green" && "border-green-300 bg-green-50 text-green-950",
    color === "red" && "border-red-300 bg-red-50 text-red-950"
  );
}

export function historyNotePreviewEntry(input: {
  text: string;
  highlighted: boolean;
  follow_up: boolean;
  text_color: HistoryNoteColor;
}): HistoryEntry {
  return {
    timestamp: new Date().toISOString(),
    action: "note",
    actor_email: null,
    actor_name: null,
    details: input.text || "Your note preview…",
    highlighted: input.highlighted,
    follow_up: input.follow_up,
    text_color: input.text_color,
  };
}
