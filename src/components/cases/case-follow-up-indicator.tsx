import { Flag } from "lucide-react";
import { hasFollowUpNote } from "@/lib/cases/history-log";
import type { HelpRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CaseFollowUpIndicatorProps {
  helpRequest: Pick<HelpRequest, "history_log">;
  className?: string;
}

export function CaseFollowUpIndicator({ helpRequest, className }: CaseFollowUpIndicatorProps) {
  if (!hasFollowUpNote(helpRequest.history_log)) {
    return null;
  }

  return (
    <span
      className={cn("inline-flex shrink-0 text-orange-600", className)}
      title="Follow-up noted in case comments"
      aria-label="Follow-up noted in case comments"
    >
      <Flag className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}
