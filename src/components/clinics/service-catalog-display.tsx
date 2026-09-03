import type { ClinicServiceOption } from "@/lib/types";
import type { EventPricingSource } from "@/lib/clinics/event-pricing";
import {
  normalizePricingMatrix,
  normalizePricingMode,
} from "@/lib/clinics/event-pricing";
import { getAddonOptions, getIncludedOptions, normalizeServiceCatalog } from "@/lib/clinics/service-catalog";
import { formatCurrency } from "@/lib/utils";
import { Check } from "lucide-react";

interface ServiceCatalogDisplayProps {
  catalog: ClinicServiceOption[];
  legacyIncluded?: string[];
  legacyAddons?: { name: string; price: number }[];
  basePrice?: number;
  pricing?: EventPricingSource;
  compact?: boolean;
  /** Hide the included-in-base section (e.g. when clinic pricing is package-based). */
  hideIncluded?: boolean;
}

export function ServiceCatalogDisplay({
  catalog,
  legacyIncluded,
  legacyAddons,
  basePrice,
  pricing,
  compact = false,
  hideIncluded = false,
}: ServiceCatalogDisplayProps) {
  const normalized = normalizeServiceCatalog(catalog, legacyIncluded, legacyAddons);
  const included = hideIncluded ? [] : getIncludedOptions(normalized);
  const addons = getAddonOptions(normalized);
  const mode = pricing ? normalizePricingMode(pricing.pricing_mode) : null;
  const matrix = pricing ? normalizePricingMatrix(pricing.pricing_matrix) : [];

  if (included.length === 0 && addons.length === 0 && mode == null && basePrice == null) {
    return null;
  }

  return (
    <div className="space-y-4">
      {mode === "sponsored" && (
        <p className="font-semibold text-base text-emerald-800 dark:text-emerald-200">
          Sponsored clinic — appointments are free
        </p>
      )}

      {mode === "flat" && (
        <p className="font-semibold text-base">
          {formatCurrency(Number(pricing?.base_price) || 0)} base price per cat
        </p>
      )}

      {mode === "matrix" && matrix.length > 0 && (
        <div>
          <p className="font-semibold text-base mb-2">Pricing by number of cats</p>
          <ul className="space-y-1.5">
            {matrix.map((tier) => (
              <li
                key={tier.cats}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {tier.cats} cat{tier.cats === 1 ? "" : "s"}
                </span>
                <span className="font-medium">{formatCurrency(tier.total_price)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode == null && basePrice != null && !hideIncluded && (
        <p className="font-semibold text-base">{formatCurrency(basePrice)} base price per cat</p>
      )}

      {mode === "matrix" && !hideIncluded && (
        <p className="text-xs text-muted-foreground">Package totals · optional add-ons are extra</p>
      )}

      {included.length > 0 && (
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {mode === "sponsored" ? "Included services" : "Included in base price"}
          </p>
          <ul className={compact ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : "space-y-2"}>
            {included.map((item) => (
              <li
                key={item.name}
                className="flex items-start gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 px-3 py-2 text-sm"
              >
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium text-emerald-950 dark:text-emerald-100">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {addons.length > 0 && (
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Optional add-on services
          </p>
          <ul className="space-y-2">
            {addons.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{item.name}</span>
                <span className="font-medium">{formatCurrency(item.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
