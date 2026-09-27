"use client";

import { useEffect, useState } from "react";

const REFRESH_MS = 30_000;

interface QueueCounts {
  cases: number;
  cats: number;
}

export function QueueSnapshot() {
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/public/queue-counts", { cache: "no-store" });
        const body = (await response.json().catch(() => null)) as QueueCounts | null;
        if (!response.ok || !body || typeof body.cases !== "number" || typeof body.cats !== "number") {
          throw new Error("unavailable");
        }
        if (!cancelled) {
          setCounts({ cases: body.cases, cats: body.cats });
          setUnavailable(false);
        }
      } catch {
        if (!cancelled) setUnavailable(true);
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void load();
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return (
    <section
      aria-live="polite"
      className="rounded-lg border bg-background px-4 py-4 text-left space-y-3"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">The volunteer queue right now</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Open cases our volunteers are still working, including yours.
        </p>
      </div>
      {counts ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-muted/60 px-3 py-3">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {counts.cases.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {counts.cases === 1 ? "case in queue" : "cases in queue"}
            </p>
          </div>
          <div className="rounded-md bg-muted/60 px-3 py-3">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {counts.cats.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {counts.cats === 1 ? "cat in queue" : "cats in queue"}
            </p>
          </div>
        </div>
      ) : unavailable ? (
        <p className="text-sm text-muted-foreground">Queue totals are unavailable right now.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Loading the current queue…</p>
      )}
    </section>
  );
}
