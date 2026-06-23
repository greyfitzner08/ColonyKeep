import type { PublicClinicEvent } from "@/lib/types";
import { normalizeServiceCatalog } from "@/lib/clinics/service-catalog";
import { ServiceCatalogDisplay } from "@/components/clinics/service-catalog-display";
import { formatDate } from "@/lib/utils";

interface EventDetailsSummaryProps {
  event: PublicClinicEvent;
  checkInDetails?: string | null;
  spotsAvailable?: number;
  showTimeLimit?: boolean;
  showNotConfirmedWarning?: boolean;
}

export function EventDetailsSummary({
  event,
  checkInDetails,
  spotsAvailable,
  showTimeLimit,
  showNotConfirmedWarning,
}: EventDetailsSummaryProps) {
  const catalog = normalizeServiceCatalog(
    event.service_catalog,
    event.included_services,
    event.addon_services
  );

  return (
    <div className="space-y-4">
      {showNotConfirmedWarning && (
        <div
          role="alert"
          className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
        >
          <p className="font-semibold">This does not guarantee your spot</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
            Submitting a request is not a confirmation. You are not booked until you receive a
            confirmation email from our team.
          </p>
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

        {spotsAvailable != null && (
          <p className="text-muted-foreground pt-1 border-t">
            {spotsAvailable} spot{spotsAvailable === 1 ? "" : "s"} currently available
          </p>
        )}
      </div>
    </div>
  );
}
