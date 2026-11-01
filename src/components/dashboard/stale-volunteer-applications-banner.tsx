import Link from "next/link";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  STALE_VOLUNTEER_APPLICATION_DAYS,
  type VolunteerApplicationQueueSummary,
} from "@/lib/volunteers/activity";

interface StaleVolunteerApplicationsBannerProps {
  summary: VolunteerApplicationQueueSummary;
}

export function StaleVolunteerApplicationsBanner({
  summary,
}: StaleVolunteerApplicationsBannerProps) {
  if (summary.staleCount === 0) return null;

  const staleLabel =
    summary.staleCount === 1
      ? "1 volunteer application has been in the queue for 5+ days"
      : `${summary.staleCount} volunteer applications have been in the queue for 5+ days`;

  const oldestLabel =
    summary.oldestWaitingDays > STALE_VOLUNTEER_APPLICATION_DAYS
      ? ` Oldest has been waiting ${summary.oldestWaitingDays} days.`
      : "";

  const queueLabel =
    summary.queuedCount > summary.staleCount
      ? ` ${summary.queuedCount} applications still need review in total.`
      : "";

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium">{staleLabel}</p>
        <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
          Pending and follow-up applications waiting more than {STALE_VOLUNTEER_APPLICATION_DAYS}{" "}
          days need a decision.
          {oldestLabel}
          {queueLabel}
        </p>
        <Button
          asChild
          type="button"
          size="sm"
          variant="outline"
          className="h-7 border-amber-300 bg-background/80 text-amber-950 hover:bg-background"
        >
          <Link href="/volunteers">Review applications</Link>
        </Button>
      </div>
    </div>
  );
}
