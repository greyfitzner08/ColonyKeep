import Link from "next/link";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  idleClaimTimingLabel,
  type IdleClaimFollowUpAlert,
} from "@/lib/cases/idle-claim-follow-up";

interface IdleClaimFollowUpBannerProps {
  alerts: IdleClaimFollowUpAlert[];
}

export function IdleClaimFollowUpBanner({ alerts }: IdleClaimFollowUpBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium">
          {alerts.length === 1
            ? "Follow up on a claimed case"
            : `Follow up on ${alerts.length} claimed cases`}
        </p>
        <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
          These cases are still claimed by you and haven&apos;t been updated in 21+ days.
        </p>
        <ul className="space-y-1.5">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                {alert.caseNumber}
                {alert.contactName ? ` · ${alert.contactName}` : ""}
                {" — "}
                {idleClaimTimingLabel(alert.idleDays)}
              </span>
              <Button
                asChild
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-amber-300 bg-background/80 text-amber-950 hover:bg-background"
              >
                <Link href={`/case/${alert.id}`}>Open case</Link>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
