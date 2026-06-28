"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import {
  HISTORY_NOTE_COLORS,
  HISTORY_NOTE_SWATCH,
  historyEntryBody,
  historyEntryClasses,
  historyEntryLabel,
  historyNotePreviewEntry,
} from "@/lib/cases/history-note-styles";
import { staffNotesFromHistory } from "@/lib/cases/history-log";
import { cn, formatDateTime } from "@/lib/utils";
import type { HistoryEntry, HistoryNoteColor } from "@/lib/types";
import { Flag, Highlighter, Plus } from "lucide-react";

interface CaseHistorySectionProps {
  entries: HistoryEntry[];
  canAddNote: boolean;
  authorName: string;
  authorEmail: string;
  saving?: boolean;
  saveError?: string | null;
  /** `notes` shows staff notes only; `all` shows the full case timeline. */
  mode?: "all" | "notes";
  onAddNote: (note: {
    text: string;
    highlighted: boolean;
    follow_up: boolean;
    text_color: HistoryNoteColor;
  }) => Promise<boolean>;
}

export function CaseHistorySection({
  entries,
  canAddNote,
  authorName,
  authorEmail,
  saving = false,
  saveError = null,
  mode = "all",
  onAddNote,
}: CaseHistorySectionProps) {
  const notesOnly = mode === "notes";
  const visibleEntries = notesOnly ? staffNotesFromHistory(entries) : entries;
  const [noteText, setNoteText] = useState("");
  const [highlighted, setHighlighted] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [textColor, setTextColor] = useState<HistoryNoteColor>("default");

  const sortedEntries = [...visibleEntries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const previewEntry = historyNotePreviewEntry({
    text: noteText,
    highlighted,
    follow_up: followUp,
    text_color: textColor,
  });

  async function handleSubmit() {
    if (!noteText.trim() || saving) return;
    const saved = await onAddNote({
      text: noteText.trim(),
      highlighted,
      follow_up: followUp,
      text_color: textColor,
    });
    if (!saved) return;
    setNoteText("");
    setHighlighted(false);
    setFollowUp(false);
    setTextColor("default");
  }

  return (
    <div className="space-y-4">
      {canAddNote && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <div className={cn(historyEntryClasses(previewEntry), "p-0 overflow-hidden")}>
            <Textarea
              id="history-note-text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              className="min-h-[4.5rem] resize-y border-0 bg-transparent shadow-none focus-visible:ring-0 rounded-none text-sm"
              placeholder={
                notesOnly
                  ? "Log a call, email, or inquiry update… Tag as follow-up when someone still needs contact."
                  : "Add a note — call, visit, trap update…"
              }
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5"
              role="group"
              aria-label="Note color"
            >
              {HISTORY_NOTE_COLORS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={textColor === option.value}
                  onClick={() => setTextColor(option.value)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-all",
                    HISTORY_NOTE_SWATCH[option.value],
                    textColor === option.value &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                  )}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-2.5 text-xs",
                highlighted && "border-amber-500 bg-amber-50 text-amber-950"
              )}
              aria-pressed={highlighted}
              onClick={() => setHighlighted((value) => !value)}
            >
              <Highlighter className="h-3.5 w-3.5 mr-1.5" />
              Highlight
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-2.5 text-xs",
                followUp && "border-orange-500 bg-orange-50 text-orange-950"
              )}
              aria-pressed={followUp}
              onClick={() => setFollowUp((value) => !value)}
            >
              <Flag className="h-3.5 w-3.5 mr-1.5" />
              Follow-up
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={() => void handleSubmit()}
                disabled={saving || !noteText.trim()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {saving ? "Saving…" : "Add note"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>Saved as {authorName} · {authorEmail}</span>
            {(highlighted || followUp || textColor !== "default") && (
              <span className="text-foreground/70">
                ·
                {textColor !== "default" && ` ${HISTORY_NOTE_COLORS.find((c) => c.value === textColor)?.label} text`}
                {highlighted && " · highlighted"}
                {followUp && " · follow-up"}
              </span>
            )}
          </div>

          {saveError && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}
        </div>
      )}

      <CaseCollapsibleSection
        title={notesOnly ? "Case notes" : "Timeline"}
        description={
          notesOnly
            ? "Intake calls, inquiry updates, and follow-ups in one place."
            : `${sortedEntries.length} entr${sortedEntries.length === 1 ? "y" : "ies"}`
        }
        defaultOpen
      >
        {sortedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {notesOnly
              ? "No notes yet. Add intake calls, inquiry updates, and follow-ups below."
              : "No history entries yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {sortedEntries.map((entry, index) => (
              <div
                key={entry.id ?? `${entry.timestamp}-${entry.action}-${index}`}
                className={historyEntryClasses(entry)}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.timestamp)}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                    {historyEntryLabel(entry)}
                  </Badge>
                  {(entry.actor_name || entry.actor_email) && (
                    <span className="text-xs text-muted-foreground">
                      {entry.actor_name ?? entry.actor_email}
                    </span>
                  )}
                  {entry.follow_up && (
                    <Badge className="bg-orange-100 text-orange-900 hover:bg-orange-100 text-[10px] px-1.5 py-0">
                      Follow-up
                    </Badge>
                  )}
                  {entry.highlighted && (
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px] px-1.5 py-0">
                      Highlighted
                    </Badge>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {historyEntryBody(entry)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CaseCollapsibleSection>
    </div>
  );
}
