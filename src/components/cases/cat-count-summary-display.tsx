import type { CatCountSummary } from "@/lib/cases/cat-counts";

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted px-4 py-3 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

interface CatCountSummaryDisplayProps {
  counts: CatCountSummary;
  pregnantCount?: number;
  /** When true, show fixed adults and kittens separately instead of one total. */
  fixedBreakdown?: boolean;
}

export function CatCountSummaryDisplay({
  counts,
  pregnantCount,
  fixedBreakdown = false,
}: CatCountSummaryDisplayProps) {
  const reportedTotal = counts.reportedAdults + counts.reportedKittens;
  const remainingTotal = counts.remainingTotal;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <section className="p-4">
          <h4 className="text-sm font-medium">Originally reported at intake</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Baseline from the initial report — this number does not change when cats are fixed.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <CountPill label="Adults (8+ wks)" value={counts.reportedAdults} />
            <CountPill label="Kittens (<8 wks)" value={counts.reportedKittens} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground tabular-nums">{reportedTotal} total</p>
        </section>

        <section className="p-4">
          <h4 className="text-sm font-medium">Still at colony</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cats not yet fixed — updates when clinic fixes are logged.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <CountPill label="Adults (8+ wks)" value={counts.remainingAdults} />
            <CountPill label="Kittens (<8 wks)" value={counts.remainingKittens} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground tabular-nums">{remainingTotal} total</p>
        </section>
      </div>

      <section className="border-t bg-muted/30 p-4">
        <h4 className="text-sm font-medium">Fixed at clinic</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {counts.fixedTotal > 0
            ? `${counts.fixedTotal} of ${reportedTotal} originally reported`
            : "None logged yet"}
        </p>
        {fixedBreakdown ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-md">
            <CountPill label="Adults fixed" value={counts.fixedAdults} />
            <CountPill label="Kittens fixed" value={counts.fixedKittens} />
          </div>
        ) : (
          <p className="mt-2 text-2xl font-semibold tabular-nums">{counts.fixedTotal}</p>
        )}
      </section>

      {pregnantCount !== undefined && (
        <div className="border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground">Suspected pregnant: </span>
          <span className="font-medium tabular-nums">{pregnantCount}</span>
        </div>
      )}
    </div>
  );
}
