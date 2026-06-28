"use client";

import { Button } from "@/components/ui/button";
import { activeFollowUpNotes, hasActiveFollowUpDueDate } from "@/lib/cases/history-log";
import { formatDate } from "@/lib/utils";
import type { HelpRequest } from "@/lib/types";
import { CheckCircle2, Flag } from "lucide-react";

interface CaseFollowUpAlertProps {
  helpRequest: HelpRequest;
  resolving?: boolean;
  onResolveAll: () => void;
}

export function CaseFollowUpAlert({
  helpRequest,
  resolving = false,
  onResolveAll,
}: CaseFollowUpAlertProps) {
  const activeNotes = activeFollowUpNotes(helpRequest.history_log);
  const overdueDueDate = hasActiveFollowUpDueDate(helpRequest.follow_up_due_date);

  if (activeNotes.length === 0 && !helpRequest.follow_up_due_date) {
    return null;
  }

  return (
    <div className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-orange-950">
            <Flag className="h-4 w-4 shrink-0" />
            Follow-up needed
          </p>
          {activeNotes.length > 0 && (
            <p className="text-sm text-orange-900">
              {activeNotes.length} open follow-up note{activeNotes.length === 1 ? "" : "s"} on this case.
            </p>
          )}
          {helpRequest.follow_up_due_date && (
            <p className="text-sm text-orange-900">
              Follow-up due {formatDate(helpRequest.follow_up_due_date)}
              {overdueDueDate ? " (overdue)" : ""}.
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 border-orange-400 bg-white text-orange-950 hover:bg-orange-100"
          onClick={onResolveAll}
          disabled={resolving}
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          {resolving ? "Saving…" : "Mark follow-up complete"}
        </Button>
      </div>
    </div>
  );
}
