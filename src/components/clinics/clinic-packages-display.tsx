import type { ClinicPackage, ClinicServiceOption } from "@/lib/types";
import { normalizeServiceCatalog } from "@/lib/clinics/service-catalog";
import { formatCurrency } from "@/lib/utils";

interface ClinicPackagesDisplayProps {
  packages: ClinicPackage[];
  catalog: ClinicServiceOption[];
  legacyIncluded?: string[];
  legacyAddons?: { name: string; price: number }[];
}

function findCatalogService(catalog: ClinicServiceOption[], serviceName: string) {
  const normalized = serviceName.trim().toLowerCase();
  return catalog.find((item) => item.name.trim().toLowerCase() === normalized);
}

function formatServicePrice(item: ClinicServiceOption | undefined): string {
  if (!item) return "—";
  if (item.included_in_base) return "Included";
  return formatCurrency(item.price);
}

export function ClinicPackagesDisplay({
  packages,
  catalog,
  legacyIncluded,
  legacyAddons,
}: ClinicPackagesDisplayProps) {
  const normalizedCatalog = normalizeServiceCatalog(catalog, legacyIncluded, legacyAddons);
  const visiblePackages = (packages ?? []).filter(
    (pkg) => pkg.name.trim() || pkg.services.length > 0 || pkg.price > 0
  );

  if (visiblePackages.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Packages</p>
      <div className="space-y-3">
        {visiblePackages.map((pkg, index) => (
          <div key={`${pkg.name}-${index}`} className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium leading-snug">{pkg.name.trim() || "Unnamed package"}</p>
              <p className="shrink-0 font-semibold">{formatCurrency(pkg.price)}</p>
            </div>

            {pkg.services.length > 0 ? (
              <ul className="divide-y rounded-md border bg-background text-sm">
                {pkg.services.map((serviceName) => {
                  const catalogItem = findCatalogService(normalizedCatalog, serviceName);
                  return (
                    <li
                      key={serviceName}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span>{serviceName}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatServicePrice(catalogItem)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No services listed for this package.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
