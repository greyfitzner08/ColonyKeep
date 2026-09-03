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
      <p className="text-sm font-medium">Packages</p>
      <div className="space-y-3">
        {visiblePackages.map((pkg, index) => (
          <div key={`${pkg.name}-${index}`} className="rounded-md border bg-muted/20 p-3 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium leading-snug">{pkg.name.trim() || "Unnamed package"}</p>
              <p className="shrink-0 text-base font-semibold tabular-nums">
                {formatCurrency(pkg.price)}
              </p>
            </div>

            {pkg.services.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {pkg.services.map((serviceName) => (
                  <span
                    key={serviceName}
                    className="rounded-md border bg-background px-2 py-0.5 text-sm text-muted-foreground"
                  >
                    {serviceName}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No services listed.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
