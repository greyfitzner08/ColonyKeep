import type { ClinicServiceOption } from "@/lib/types";
import { getAddonOptions, getIncludedOptions, normalizeServiceCatalog } from "@/lib/clinics/service-catalog";
import { formatCurrency } from "@/lib/utils";
import { Check } from "lucide-react";

interface ServiceCatalogDisplayProps {
  catalog: ClinicServiceOption[];
  legacyIncluded?: string[];
  legacyAddons?: { name: string; price: number }[];
  basePrice?: number;
  compact?: boolean;
  /** Hide the included-in-base section (e.g. when clinic pricing is package-based). */
  hideIncluded?: boolean;
}

export function ServiceCatalogDisplay({
  catalog,
  legacyIncluded,
  legacyAddons,
  basePrice,
  compact = false,
  hideIncluded = false,
}: ServiceCatalogDisplayProps) {
  const normalized = normalizeServiceCatalog(catalog, legacyIncluded, legacyAddons);
  const included = hideIncluded ? [] : getIncludedOptions(normalized);
  const addons = getAddonOptions(normalized);

  if (included.length === 0 && addons.length === 0) return null;

  return (
    <div className="space-y-4">
      {basePrice != null && !hideIncluded && (
        <p className="font-semibold text-base">{formatCurrency(basePrice)} base price per cat</p>
      )}

      {included.length > 0 && (
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Included in base price
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
