import { cn } from "@/lib/utils";

interface SpotsLeftCounterProps {
  remaining: number;
  size?: "compact" | "featured";
  className?: string;
}

function remainingTone(remaining: number) {
  if (remaining <= 0) return "full" as const;
  if (remaining <= 3) return "urgent" as const;
  return "open" as const;
}

export function SpotsLeftCounter({
  remaining,
  size = "compact",
  className,
}: SpotsLeftCounterProps) {
  const tone = remainingTone(remaining);
  const soldOut = tone === "full";
  const label = soldOut
    ? "No spots left"
    : remaining === 1
      ? "spot left"
      : "spots left";

  if (size === "featured") {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center gap-4 rounded-lg border-2 px-4 py-3",
          tone === "full" && "border-muted-foreground/30 bg-muted",
          tone === "urgent" && "border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-950/40",
          tone === "open" && "border-primary bg-primary/10",
          className
        )}
      >
        <p
          className={cn(
            "text-4xl font-bold tabular-nums leading-none",
            tone === "full" && "text-muted-foreground",
            tone === "urgent" && "text-amber-800 dark:text-amber-200",
            tone === "open" && "text-primary"
          )}
        >
          {remaining}
        </p>
        <div>
          <p
            className={cn(
              "text-base font-semibold",
              tone === "full" && "text-muted-foreground",
              tone === "urgent" && "text-amber-950 dark:text-amber-100",
              tone === "open" && "text-foreground"
            )}
          >
            {soldOut ? "Clinic is full" : remaining === 1 ? "Spot left" : "Spots left"}
          </p>
          <p
            className={cn(
              "text-sm",
              tone === "urgent"
                ? "text-amber-800 dark:text-amber-200"
                : "text-muted-foreground"
            )}
          >
            {soldOut
              ? "This clinic is no longer accepting requests."
              : tone === "urgent"
                ? "Filling up — request soon"
                : "Currently available to request"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "flex min-w-[5.75rem] flex-col items-center rounded-lg border-2 px-3 py-2 text-center",
        tone === "full" && "border-muted-foreground/30 bg-muted text-muted-foreground",
        tone === "urgent" &&
          "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-100",
        tone === "open" && "border-primary bg-primary/10 text-primary",
        className
      )}
    >
      <span className="text-2xl font-bold leading-none tabular-nums">{remaining}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide">{label}</span>
    </div>
  );
}
