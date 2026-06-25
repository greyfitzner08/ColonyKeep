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
  if (entry.action === "routed_to_trap_team") return "Routed to trap";
  return entry.action.replace(/_/g, " ");
}

export function historyEntryBody(entry: HistoryEntry): string {
  return entry.details?.trim() || entry.action.replace(/_/g, " ");
}

export function historyEntryClasses(entry: HistoryEntry): string {
  const color = entry.text_color ?? "default";

  return cn(
    "rounded-md border px-3 py-2 text-sm leading-relaxed",
    entry.highlighted && "ring-2 ring-amber-400/70 shadow-sm",
    entry.follow_up && "border-orange-300",
    color === "default" && "bg-card",
    color === "amber" && "border-amber-200 bg-amber-50 text-amber-950",
    color === "blue" && "border-blue-200 bg-blue-50 text-blue-950",
    color === "green" && "border-green-200 bg-green-50 text-green-950",
    color === "red" && "border-red-200 bg-red-50 text-red-950"
  );
}
