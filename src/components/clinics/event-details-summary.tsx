import type { PublicClinicEvent } from "@/lib/types";
import { normalizeServiceCatalog } from "@/lib/clinics/service-catalog";
import { ServiceCatalogDisplay } from "@/components/clinics/service-catalog-display";
import { SpotsLeftCounter } from "@/components/clinics/spots-left-counter";
import { formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface EventDetailsSummaryProps {
  event: PublicClinicEvent;
  checkInDetails?: string | null;
  spotsAvailable?: number;
  showTimeLimit?: boolean;
  /** Yellow banner: cats must already be trapped before claiming a spot. */
  showTrapReadyWarning?: boolean;
}

export function EventDetailsSummary({
  event,
  checkInDetails,
  spotsAvailable,
  showTimeLimit,
  showTrapReadyWarning,
}: EventDetailsSummaryProps) {
  const catalog = normalizeServiceCatalog(
    event.service_catalog,
    event.included_services,
    event.addon_services
  );

  return (
    <div className="space-y-4">
      {showTrapReadyWarning && (
        <div
          role="alert"
          className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="font-semibold">
                Cats must already be in a trap before you claim a spot
              </p>
              <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                Only request an appointment once you for certain have the cat(s) secured in a humane
                trap. Claiming a spot and not showing up will revoke privileges to use future clinic
                appointments.
              </p>
            </div>
          </div>
        </div>
      )}

      {showTimeLimit && (
        <div
          role="alert"
          className="rounded-lg border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/30 px-4 py-3 text-sm"
        >
          <p className="font-semibold text-orange-950 dark:text-orange-100">10-minute time limit</p>
          <p className="mt-1 text-orange-900/90 dark:text-orange-100/90">
            Once you continue, you have 10 minutes to complete the form while your spots are held.
          </p>
        </div>
      )}

      {spotsAvailable != null && (
        <SpotsLeftCounter remaining={spotsAvailable} size="featured" />
      )}

      <div className="rounded-lg border bg-card p-4 space-y-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Clinic</p>
          <p className="font-semibold text-base">{event.clinic_name}</p>
          <p className="text-lg font-medium mt-1">{event.title}</p>
        </div>

        <div className="grid gap-1">
          <p><span className="font-medium">Date:</span> {formatDate(event.date)}</p>
          <p><span className="font-medium">Location:</span> {event.location}</p>
        </div>

        <ServiceCatalogDisplay catalog={catalog} basePrice={event.base_price} />

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
    </div>
  );
}
