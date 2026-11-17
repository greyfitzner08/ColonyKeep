"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClinicPackagesDisplay } from "@/components/clinics/clinic-packages-display";
import { ServiceCatalogDisplay } from "@/components/clinics/service-catalog-display";
import { clinicWebsiteHref, normalizeClinicEmails } from "@/lib/clinics/contact";
import {
  formatClinicHoursSummary,
  normalizeClinicHours,
} from "@/lib/clinics/hours";
import { hasVisibleClinicPackages } from "@/lib/clinics/service-catalog";
import { APPOINTMENTS_UI_ENABLED } from "@/lib/features";
import type { Clinic } from "@/lib/types";

interface ClinicDetailsDialogProps {
  clinic: Clinic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  error?: string | null;
  onEdit?: (clinic: Clinic) => void;
}

export function ClinicDetailsDialog({
  clinic,
  open,
  onOpenChange,
  loading = false,
  error = null,
  onEdit,
}: ClinicDetailsDialogProps) {
  const usesPackagePricing = clinic ? hasVisibleClinicPackages(clinic.packages) : false;
  const hoursSummary = clinic
    ? formatClinicHoursSummary(
        clinic.operating_days,
        normalizeClinicHours(clinic.hours_by_day)
      )
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="space-y-3 py-6">
            <DialogHeader>
              <DialogTitle>Clinic details</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Loading clinic details…</p>
          </div>
        ) : error ? (
          <div className="space-y-3 py-6">
            <DialogHeader>
              <DialogTitle>Clinic details</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : clinic ? (
          <>
            <DialogHeader>
              <DialogTitle>{clinic.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">{clinic.address || "No address on file"}</p>
                {clinic.phone ? (
                  <a href={`tel:${clinic.phone}`} className="block text-primary hover:underline">
                    {clinic.phone}
                  </a>
                ) : null}
                {normalizeClinicEmails(clinic.emails).map((email) => (
                  <a
                    key={email}
                    href={`mailto:${email}`}
                    className="block text-primary hover:underline"
                  >
                    {email}
                  </a>
                ))}
                {clinic.website?.trim() ? (
                  <a
                    href={clinicWebsiteHref(clinic.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-primary hover:underline"
                  >
                    {clinic.website.trim()}
                  </a>
                ) : null}
              </div>

              <div>
                <p>
                  <span className="font-medium">Days open:</span>{" "}
                  {clinic.operating_days.join(", ") || "Not set"}
                </p>
                {hoursSummary ? (
                  <p>
                    <span className="font-medium">Hours:</span> {hoursSummary}
                  </p>
                ) : null}
                {APPOINTMENTS_UI_ENABLED ? (
                  <p>
                    <span className="font-medium">Slots per day:</span> {clinic.slots_per_day}
                  </p>
                ) : null}
              </div>

              <ClinicPackagesDisplay packages={clinic.packages ?? []} />

              <ServiceCatalogDisplay
                catalog={clinic.service_catalog ?? []}
                legacyIncluded={clinic.included_services}
                legacyAddons={clinic.addon_services}
                hideIncluded={usesPackagePricing}
              />

              {clinic.check_in_details ? (
                <div>
                  <p className="mb-1 font-medium">Check-in details</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {clinic.check_in_details}
                  </p>
                </div>
              ) : null}

              {clinic.notes ? (
                <div>
                  <p className="mb-1 font-medium">Notes</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{clinic.notes}</p>
                </div>
              ) : null}

              {onEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onEdit(clinic);
                    onOpenChange(false);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit clinic
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
