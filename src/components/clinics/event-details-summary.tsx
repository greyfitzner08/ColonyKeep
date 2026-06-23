import type { PublicClinicEvent } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Calendar, MapPin, AlertTriangle, Clock } from "lucide-react";

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
  showTimeLimit = false,
  showNotConfirmedWarning = false,
}: EventDetailsSummaryProps) {
  return (
    <div className="space-y-4">
      {showNotConfirmedWarning && (
        <div
          role="alert"
          className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
        >
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">This does not guarantee your spot</p>
              <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                Submitting this form only requests a spot. Your booking is not confirmed until
                you receive a confirmation email from our team.
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
          <div className="flex gap-3">
            <Clock className="h-5 w-5 shrink-0 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-950 dark:text-orange-100">
                10-minute time limit
              </p>
              <p className="mt-1 text-orange-900/90 dark:text-orange-100/90">
                Once you start, you have 10 minutes to complete the form. Spots are temporarily
                held during that time so others cannot take them.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Clinic</p>
          <p className="font-semibold text-base">{event.clinic_name}</p>
          <p className="text-lg font-medium mt-1">{event.title}</p>
        </div>

        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">{formatDate(event.date)}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">Location</p>
            <p className="text-muted-foreground">{event.location}</p>
          </div>
        </div>

        <div>
          <p className="font-medium">Cost</p>
          <p>{formatCurrency(event.base_price)} base price per cat</p>
          {event.cost_description && (
            <p className="text-muted-foreground mt-1">{event.cost_description}</p>
          )}
        </div>

        {event.included_services.length > 0 && (
          <div>
            <p className="font-medium mb-1">Included in base price</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              {event.included_services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>
        )}

        {event.addon_services.length > 0 && (
          <div>
            <p className="font-medium mb-1">Optional add-ons</p>
            <ul className="text-muted-foreground space-y-0.5">
              {event.addon_services.map((addon) => (
                <li key={addon.name}>
                  {addon.name} — {formatCurrency(addon.price)}
                </li>
              ))}
            </ul>
          </div>
        )}

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
