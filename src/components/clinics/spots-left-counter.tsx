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

  if (size === "featured") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center gap-4 rounded-xl border-4 px-5 py-4 shadow-sm",
          tone === "full" && "border-muted-foreground/40 bg-muted",
          tone === "urgent" &&
            "border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-950/40",
          tone === "open" && "border-primary bg-primary/15",
          className
        )}
      >
        <p
          className={cn(
            "min-w-[3.5rem] text-center text-5xl font-extrabold tabular-nums leading-none",
            tone === "full" && "text-muted-foreground",
            tone === "urgent" && "text-amber-800 dark:text-amber-200",
            tone === "open" && "text-primary"
          )}
        >
          {remaining}
        </p>
        <div className="min-w-0">
          <p
            className={cn(
              "text-lg font-bold leading-tight",
              tone === "full" && "text-muted-foreground",
              tone === "urgent" && "text-amber-950 dark:text-amber-100",
              tone === "open" && "text-foreground"
            )}
          >
            {soldOut ? "Clinic is full" : remaining === 1 ? "Spot left" : "Spots left"}
          </p>
          <p
            className={cn(
              "mt-0.5 text-sm font-medium",
              tone === "urgent"
                ? "text-amber-800 dark:text-amber-200"
                : "text-muted-foreground"
            )}
          >
            {soldOut
              ? "This clinic is no longer accepting requests."
              : tone === "urgent"
                ? "Filling up fast — request soon"
                : "Available to request right now"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-w-[6.5rem] flex-col items-center rounded-xl border-4 px-3 py-2.5 text-center shadow-sm",
        tone === "full" && "border-muted-foreground/40 bg-muted text-muted-foreground",
        tone === "urgent" &&
          "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-100",
        tone === "open" && "border-primary bg-primary/15 text-primary",
        className
      )}
    >
      <span className="text-3xl font-extrabold leading-none tabular-nums">{remaining}</span>
      <span className="mt-1 text-[11px] font-bold uppercase tracking-wide">
        {soldOut ? "Full" : remaining === 1 ? "Spot left" : "Spots left"}
      </span>
    </div>
  );
}
