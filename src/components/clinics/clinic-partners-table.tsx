"use client";

import { useMemo, useState } from "react";
import { Eye, Pencil, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ClinicPackagesDisplay } from "@/components/clinics/clinic-packages-display";
import { ServiceCatalogDisplay } from "@/components/clinics/service-catalog-display";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getVisibleClinicPackages } from "@/lib/clinics/clinic-packages";
import {
  getAddonOptions,
  hasVisibleClinicPackages,
  normalizeServiceCatalog,
} from "@/lib/clinics/service-catalog";
import type { Clinic } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface ClinicPartnersTableProps {
  clinics: Clinic[];
  onEdit: (clinic: Clinic) => void;
}

function matchesSearch(clinic: Clinic, query: string): boolean {
  const haystack = [
    clinic.name,
    clinic.address,
    clinic.phone,
    clinic.operating_days.join(" "),
    clinic.check_in_details,
    clinic.notes,
    ...(clinic.packages ?? []).flatMap((pkg) => [pkg.name, ...pkg.services]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function formatOperatingDays(days: string[]): string {
  if (days.length === 0) return "—";
  return days.map((day) => day.slice(0, 3)).join(", ");
}

function PackagesSummary({ clinic }: { clinic: Clinic }) {
  const packages = getVisibleClinicPackages(clinic.packages);

  if (packages.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <ul className="space-y-1 text-sm">
      {packages.map((pkg, index) => (
        <li key={`${pkg.name}-${index}`}>
          <span className="font-medium">{pkg.name.trim() || "Unnamed package"}</span>
          <span className="text-muted-foreground"> · {formatCurrency(pkg.price)}</span>
        </li>
      ))}
    </ul>
  );
}

function AddonsSummary({ clinic }: { clinic: Clinic }) {
  const catalog = normalizeServiceCatalog(
    clinic.service_catalog,
    clinic.included_services,
    clinic.addon_services
  );
  const addons = getAddonOptions(catalog);

  if (addons.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <ul className="space-y-1 text-sm">
      {addons.map((addon) => (
        <li key={addon.name}>
          {addon.name}
          <span className="text-muted-foreground"> · {formatCurrency(addon.price)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ClinicPartnersTable({ clinics, onEdit }: ClinicPartnersTableProps) {
  const [search, setSearch] = useState("");
  const [viewingClinic, setViewingClinic] = useState<Clinic | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clinics;
    return clinics.filter((clinic) => matchesSearch(clinic, query));
  }, [clinics, search]);

  const columns = useMemo((): DataTableColumn<Clinic>[] => {
    return [
      {
        id: "clinic",
        label: "Clinic",
        defaultWidth: 220,
        wrap: true,
        sortValue: (clinic) => clinic.name,
        render: (clinic) => (
          <div>
            <p className="font-medium">{clinic.name}</p>
            <p className="text-sm text-muted-foreground">{clinic.address || "—"}</p>
          </div>
        ),
      },
      {
        id: "phone",
        label: "Phone",
        defaultWidth: 130,
        sortValue: (clinic) => clinic.phone ?? "",
        render: (clinic) =>
          clinic.phone ? (
            <a href={`tel:${clinic.phone}`} className="whitespace-nowrap text-primary hover:underline">
              {clinic.phone}
            </a>
          ) : (
            "—"
          ),
      },
      {
        id: "schedule",
        label: "Schedule",
        defaultWidth: 140,
        wrap: true,
        render: (clinic) => (
          <div className="text-sm">
            <p>{formatOperatingDays(clinic.operating_days)}</p>
            <p className="text-muted-foreground">{clinic.slots_per_day} slots/day</p>
          </div>
        ),
      },
      {
        id: "packages",
        label: "Packages",
        defaultWidth: 280,
        wrap: true,
        render: (clinic) => <PackagesSummary clinic={clinic} />,
      },
      {
        id: "addons",
        label: "Add-ons",
        defaultWidth: 200,
        wrap: true,
        render: (clinic) => <AddonsSummary clinic={clinic} />,
      },
      {
        id: "status",
        label: "Status",
        defaultWidth: 90,
        sortValue: (clinic) => (clinic.is_active ? "Active" : "Inactive"),
        render: (clinic) => (
          <Badge variant={clinic.is_active ? "default" : "secondary"}>
            {clinic.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        label: "",
        defaultWidth: 100,
        render: (clinic) => (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`View ${clinic.name}`}
              onClick={() => setViewingClinic(clinic)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Edit ${clinic.name}`}
              onClick={() => onEdit(clinic)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];
  }, [onEdit]);

  const viewingUsesPackagePricing = viewingClinic
    ? hasVisibleClinicPackages(viewingClinic.packages)
    : false;

  return (
    <>
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clinics, packages…"
            className="pl-9"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {clinics.length} clinics
        </p>

        <DataTable
          tableId="clinics"
          columns={columns}
          rows={filtered}
          getRowKey={(clinic) => clinic.id}
          emptyMessage="No clinics match your search."
          minTableWidth={980}
          enableSearch={false}
        />
      </div>

      <Dialog open={viewingClinic !== null} onOpenChange={(open) => !open && setViewingClinic(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewingClinic && (
            <>
              <DialogHeader>
                <DialogTitle>{viewingClinic.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">{viewingClinic.address || "No address on file"}</p>
                  {viewingClinic.phone && (
                    <a href={`tel:${viewingClinic.phone}`} className="text-primary hover:underline">
                      {viewingClinic.phone}
                    </a>
                  )}
                </div>

                <div>
                  <p>
                    <span className="font-medium">Operating days:</span>{" "}
                    {viewingClinic.operating_days.join(", ") || "Not set"}
                  </p>
                  <p>
                    <span className="font-medium">Slots per day:</span> {viewingClinic.slots_per_day}
                  </p>
                </div>

                <ClinicPackagesDisplay packages={viewingClinic.packages ?? []} />

                <ServiceCatalogDisplay
                  catalog={viewingClinic.service_catalog ?? []}
                  legacyIncluded={viewingClinic.included_services}
                  legacyAddons={viewingClinic.addon_services}
                  hideIncluded={viewingUsesPackagePricing}
                />

                {viewingClinic.check_in_details && (
                  <div>
                    <p className="font-medium mb-1">Check-in details</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {viewingClinic.check_in_details}
                    </p>
                  </div>
                )}

                {viewingClinic.notes && (
                  <div>
                    <p className="font-medium mb-1">Notes</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{viewingClinic.notes}</p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const clinic = viewingClinic;
                    setViewingClinic(null);
                    onEdit(clinic);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit clinic
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
