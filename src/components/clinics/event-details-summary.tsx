"use client";

import { useState, useEffect } from "react";
import type { PublicClinicEvent } from "@/lib/types";
import { normalizeServiceCatalog } from "@/lib/clinics/service-catalog";
import { ServiceCatalogDisplay } from "@/components/clinics/service-catalog-display";
import { SpotsLeftCounter } from "@/components/clinics/spots-left-counter";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ChevronRight, Clock } from "lucide-react";

interface EventDetailsSummaryProps {
  event: PublicClinicEvent;
  checkInDetails?: string | null;
  spotsAvailable?: number;
  showTimeLimit?: boolean;
  /** Minutes the hold lasts; shown even when clinic details are collapsed. */
  holdMinutes?: number;
  /** Yellow notice: cats must already be trapped before claiming a spot. */
  showTrapReadyWarning?: boolean;
  /** Hide clinic/title block when the parent card already shows them. */
  hideTitle?: boolean;
  /** Start collapsed so later signup steps don't repeat the full clinic card. */
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function EventDetailsSummary({
  event,
  checkInDetails,
  spotsAvailable,
  showTimeLimit,
  holdMinutes = 10,
  showTrapReadyWarning,
  hideTitle = false,
  collapsible = false,
  defaultExpanded = true,
}: EventDetailsSummaryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);
  const catalog = normalizeServiceCatalog(
    event.service_catalog,
    event.included_services,
    event.addon_services
  );
  const showBody = !collapsible || expanded;

  return (
    <div className="space-y-3">
      {showTrapReadyWarning && (
        <div
          role="alert"
          className="flex gap-2 rounded-md border border-amber-400/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
          <p>
            <span className="font-semibold">Cats must already be in a trap. </span>
            Only claim a spot once you for certain have them secured. No-shows lose future clinic
            privileges.
          </p>
        </div>
      )}

      <div className="rounded-lg border bg-card text-sm">
        {collapsible ? (
          <button
            type="button"
            className="flex w-full items-start gap-3 px-4 py-3 text-left"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{event.clinic_name}</p>
              <p className="text-muted-foreground">
                {event.title} · {formatDate(event.date)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {expanded ? "Hide clinic details" : "Show clinic details"}
              </p>
            </div>
            {spotsAvailable != null && (
              <SpotsLeftCounter remaining={spotsAvailable} size="compact" className="shrink-0" />
            )}
          </button>
        ) : (
          (spotsAvailable != null || !hideTitle) && (
            <div className="flex items-start justify-between gap-4 p-4 pb-0">
              {!hideTitle ? (
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Clinic</p>
                  <p className="font-semibold text-base">{event.clinic_name}</p>
                  <p className="text-lg font-medium mt-1">{event.title}</p>
                </div>
              ) : (
                <div className="min-w-0" />
              )}
              {spotsAvailable != null && (
                <SpotsLeftCounter remaining={spotsAvailable} size="compact" className="shrink-0" />
              )}
            </div>
          )
        )}

        {showTimeLimit && (
          <p className="flex items-start gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Spots are held for <strong>{holdMinutes} minute{holdMinutes === 1 ? "" : "s"}</strong>{" "}
              while you finish filling out your request.
            </span>
          </p>
        )}

        {showBody && (
          <div className="space-y-4 border-t p-4">
            <div className="grid gap-1">
              {!collapsible && (
                <p><span className="font-medium">Date:</span> {formatDate(event.date)}</p>
              )}
              <p><span className="font-medium">Location:</span> {event.location}</p>
            </div>

            <ServiceCatalogDisplay catalog={catalog} pricing={event} />

            {event.description && (
              <div>
                <p className="font-medium mb-1">About this clinic</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {checkInDetails && (
              <div>
                <p className="font-medium mb-1">Check-in details</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{checkInDetails}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
