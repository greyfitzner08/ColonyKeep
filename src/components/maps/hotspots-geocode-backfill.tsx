"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { HelpRequest } from "@/lib/types";

interface HotspotsGeocodeBackfillProps {
  helpRequests: HelpRequest[];
  onHelpRequestsChange: (updater: (current: HelpRequest[]) => HelpRequest[]) => void;
}

interface BatchResult {
  geocoded: number;
  failed: number;
  skippedNoAddress: number;
  remaining: number;
  lastProcessedId: string | null;
  exhausted: boolean;
  updated: Array<{ id: string; colony_lat: number; colony_lng: number }>;
}

export function HotspotsGeocodeBackfill({
  helpRequests,
  onHelpRequestsChange,
}: HotspotsGeocodeBackfillProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const mappedCount = useMemo(
    () => helpRequests.filter((hr) => hr.colony_lat && hr.colony_lng).length,
    [helpRequests]
  );

  const unmappedCount = helpRequests.length - mappedCount;

  const applyUpdates = useCallback(
    (updated: BatchResult["updated"]) => {
      if (updated.length === 0) return;
      const byId = new Map(updated.map((entry) => [entry.id, entry]));
      onHelpRequestsChange((current) =>
        current.map((hr) => {
          const coords = byId.get(hr.id);
          if (!coords) return hr;
          return { ...hr, colony_lat: coords.colony_lat, colony_lng: coords.colony_lng };
        })
      );
    },
    [onHelpRequestsChange]
  );

  const runBatch = useCallback(async (startAfterId: string | null) => {
    const response = await fetch("/api/admin/hotspots/geocode-backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 20, startAfterId }),
    });
    const payload = (await response.json().catch(() => null)) as BatchResult | { error?: string };
    if (!response.ok) {
      throw new Error("error" in payload && payload.error ? payload.error : "Backfill failed");
    }
    return payload as BatchResult;
  }, []);

  const handleBackfill = useCallback(async () => {
    setRunning(true);
    setStatus("Starting geocode backfill…");

    try {
      let totalGeocoded = 0;
      let totalFailed = 0;
      let batch = 0;
      let startAfterId: string | null = null;

      while (true) {
        batch += 1;
        setStatus(`Geocoding batch ${batch}…`);
        const result = await runBatch(startAfterId);
        totalGeocoded += result.geocoded;
        totalFailed += result.failed;
        setRemaining(result.remaining);
        applyUpdates(result.updated);
        startAfterId = result.lastProcessedId;

        if (result.remaining === 0) {
          setStatus(
            `Done — ${totalGeocoded} colon${totalGeocoded === 1 ? "y" : "ies"} mapped` +
              (totalFailed > 0 ? `, ${totalFailed} could not be geocoded` : "") +
              "."
          );
          router.refresh();
          break;
        }

        if (result.exhausted) {
          setStatus(
            `Finished — ${totalGeocoded} mapped` +
              (totalFailed > 0 ? `, ${totalFailed} failed` : "") +
              `. ${result.remaining} case${result.remaining === 1 ? "" : "s"} still lack coordinates` +
              " (missing or unusable address)."
          );
          router.refresh();
          break;
        }

        if (!result.lastProcessedId) {
          break;
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Backfill failed.");
    } finally {
      setRunning(false);
    }
  }, [applyUpdates, router, runBatch]);

  if (unmappedCount === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Unmapped colonies</p>
          <p className="text-xs text-muted-foreground">
            {mappedCount} of {helpRequests.length} hotspot cases have map coordinates.
            {remaining != null && remaining > 0
              ? ` About ${remaining} still need geocoding.`
              : ` ${unmappedCount} have addresses but no coordinates yet.`}
          </p>
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </div>
        <Button type="button" size="sm" onClick={handleBackfill} disabled={running}>
          {running ? "Geocoding…" : "Geocode unmapped colonies"}
        </Button>
      </div>
    </div>
  );
}
