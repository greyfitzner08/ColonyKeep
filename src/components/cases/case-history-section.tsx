"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import {
  HISTORY_NOTE_COLORS,
  historyEntryBody,
  historyEntryClasses,
  historyEntryLabel,
} from "@/lib/cases/history-note-styles";
import { formatDateTime } from "@/lib/utils";
import type { HistoryEntry, HistoryNoteColor } from "@/lib/types";
import { Flag, Highlighter } from "lucide-react";

interface CaseHistorySectionProps {
  entries: HistoryEntry[];
  canAddNote: boolean;
  authorName: string;
  authorEmail: string;
  saving?: boolean;
  onAddNote: (note: {
    text: string;
    highlighted: boolean;
    follow_up: boolean;
    text_color: HistoryNoteColor;
  }) => void;
}

export function CaseHistorySection({
  entries,
  canAddNote,
  authorName,
  authorEmail,
  saving = false,
  onAddNote,
}: CaseHistorySectionProps) {
  const [noteText, setNoteText] = useState("");
  const [highlighted, setHighlighted] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [textColor, setTextColor] = useState<HistoryNoteColor>("default");

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  function handleSubmit() {
    if (!noteText.trim()) return;
    onAddNote({
      text: noteText.trim(),
      highlighted,
      follow_up: followUp,
      text_color: textColor,
    });
    setNoteText("");
    setHighlighted(false);
    setFollowUp(false);
    setTextColor("default");
  }

  return (
    <div className="space-y-4">
      {canAddNote && (
        <CaseCollapsibleSection title="Add history note" defaultOpen>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="history-note-text">Note</Label>
              <Textarea
                id="history-note-text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
                placeholder="Document a call, visit, coordination update, or trap progress…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Text color</Label>
                <Select
                  value={textColor}
                  onValueChange={(value) => setTextColor(value as HistoryNoteColor)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HISTORY_NOTE_COLORS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={highlighted}
                  onCheckedChange={(checked) => setHighlighted(checked === true)}
                />
                <Highlighter className="h-4 w-4 text-muted-foreground" />
                Highlight note
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={followUp}
                  onCheckedChange={(checked) => setFollowUp(checked === true)}
                />
                <Flag className="h-4 w-4 text-muted-foreground" />
                Mark follow-up
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              Notes are saved as {authorName} ({authorEmail}).
            </p>

            <Button type="button" onClick={handleSubmit} disabled={saving || !noteText.trim()}>
              {saving ? "Saving…" : "Add note"}
            </Button>
          </div>
        </CaseCollapsibleSection>
      )}

      <CaseCollapsibleSection
        title="Timeline"
        description={`${sortedEntries.length} entr${sortedEntries.length === 1 ? "y" : "ies"}`}
        defaultOpen
      >
        {sortedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history entries yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedEntries.map((entry, index) => (
              <div
                key={entry.id ?? `${entry.timestamp}-${entry.action}-${index}`}
                className={historyEntryClasses(entry)}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatDateTime(entry.timestamp)}
                  </span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {historyEntryLabel(entry)}
                  </Badge>
                  {(entry.actor_name || entry.actor_email) && (
                    <span className="text-xs text-muted-foreground">
                      · {entry.actor_name ?? entry.actor_email}
                    </span>
                  )}
                  {entry.follow_up && (
                    <Badge className="bg-orange-100 text-orange-900 hover:bg-orange-100 text-xs">
                      Follow-up
                    </Badge>
                  )}
                  {entry.highlighted && (
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-xs">
                      Highlighted
                    </Badge>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{historyEntryBody(entry)}</p>
              </div>
            ))}
          </div>
        )}
      </CaseCollapsibleSection>
    </div>
  );
}
