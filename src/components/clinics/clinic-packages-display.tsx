import type { ClinicPackage } from "@/lib/types";
import { getVisibleClinicPackages } from "@/lib/clinics/clinic-packages";
import { formatCurrency } from "@/lib/utils";

interface ClinicPackagesDisplayProps {
  packages: ClinicPackage[];
}

export function ClinicPackagesDisplay({ packages }: ClinicPackagesDisplayProps) {
  const visiblePackages = getVisibleClinicPackages(packages);

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
              <ul className="rounded-md border bg-background px-3 py-2 text-sm space-y-1">
                {pkg.services.map((serviceName) => (
                  <li key={serviceName}>{serviceName}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No items listed for this package.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
