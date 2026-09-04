import type { CatCountSummary } from "@/lib/cases/cat-counts";
import { cn } from "@/lib/utils";

interface CatCountSummaryDisplayProps {
  counts: CatCountSummary;
  pregnantCount?: number;
}

function CountCell({ value, className }: { value: number; className?: string }) {
  return (
    <td className={cn("px-4 py-2.5 text-right tabular-nums", className)}>
      {value}
    </td>
  );
}

export function CatCountSummaryDisplay({ counts, pregnantCount }: CatCountSummaryDisplayProps) {
  const reportedTotal = counts.reportedAdults + counts.reportedKittens;
  const fixedPercent = reportedTotal > 0 ? Math.round((counts.fixedTotal / reportedTotal) * 100) : 0;
  const unfixedPercent =
    reportedTotal > 0 ? Math.round((counts.unfixedTotal / reportedTotal) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b bg-muted/20 px-4 py-3">
        <p className="text-sm">
          <span className="font-semibold tabular-nums">{counts.fixedTotal}</span>
          <span className="text-muted-foreground"> of </span>
          <span className="font-semibold tabular-nums">{reportedTotal}</span>
          <span className="text-muted-foreground"> originally reported cats have been fixed</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {counts.unfixedTotal} still need fixing
          {reportedTotal > 0 ? ` (${unfixedPercent}% of reported)` : ""}
          {counts.fosterTotal > 0 && (
            <>
              {" · "}
              {counts.fosterTotal} sent to foster/facility
            </>
          )}
        </p>
        {reportedTotal > 0 && (
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={counts.fixedTotal}
            aria-valuemin={0}
            aria-valuemax={reportedTotal}
            aria-label={`${counts.fixedTotal} of ${reportedTotal} cats fixed`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${fixedPercent}%` }}
            />
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium" scope="col" />
              <th className="px-4 py-2 text-right font-medium" scope="col">
                Adults
              </th>
              <th className="px-4 py-2 text-right font-medium" scope="col">
                Kittens
              </th>
              <th className="px-4 py-2 text-right font-medium" scope="col">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <th className="px-4 py-2.5 text-left font-medium" scope="row">
                Originally reported
              </th>
              <CountCell value={counts.reportedAdults} />
              <CountCell value={counts.reportedKittens} />
              <CountCell value={reportedTotal} className="font-medium" />
            </tr>
            <tr className="border-b bg-primary/5">
              <th className="px-4 py-2.5 text-left font-medium text-primary" scope="row">
                Fixed at clinic
              </th>
              <CountCell value={counts.fixedAdults} className="text-primary" />
              <CountCell value={counts.fixedKittens} className="text-primary" />
              <CountCell value={counts.fixedTotal} className="font-medium text-primary" />
            </tr>
            {counts.fosterTotal > 0 && (
              <tr className="bg-amber-50 dark:bg-amber-950/20">
                <th className="px-4 py-2.5 text-left font-medium text-amber-800 dark:text-amber-200" scope="row">
                  Sent to foster/facility
                </th>
                <CountCell
                  value={counts.fosterAdults}
                  className="text-amber-800 dark:text-amber-200"
                />
                <CountCell
                  value={counts.fosterKittens}
                  className="text-amber-800 dark:text-amber-200"
                />
                <CountCell
                  value={counts.fosterTotal}
                  className="font-medium text-amber-800 dark:text-amber-200"
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        Originally reported and suspected pregnant counts are set at intake and stay fixed. Fixed
        cats — whether returned to the colony or sent to foster/facility — no longer count toward
        still need fixing.
      </p>

      {pregnantCount !== undefined && pregnantCount > 0 && (
        <div className="border-t px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Suspected pregnant: </span>
          <span className="font-medium tabular-nums">{pregnantCount}</span>
        </div>
      )}
    </div>
  );
}
