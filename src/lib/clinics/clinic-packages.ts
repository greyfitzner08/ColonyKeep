import type { ClinicPackage } from "@/lib/types";

export function getVisibleClinicPackages(packages: ClinicPackage[] | null | undefined): ClinicPackage[] {
  return (packages ?? []).filter(
    (pkg) => pkg.name.trim() || pkg.services.length > 0 || pkg.price > 0
  );
}
