"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClinicPartnersTable } from "@/components/clinics/clinic-partners-table";
import { ClinicPackagesEditor } from "@/components/clinics/clinic-packages-editor";
import { ServiceCatalogEditor } from "@/components/clinics/service-catalog-editor";
import {
  AddressAutocomplete,
  formatAddressPartsLine,
} from "@/components/forms/address-autocomplete";
import {
  hasVisibleClinicPackages,
  normalizeServiceCatalog,
} from "@/lib/clinics/service-catalog";
import { APPOINTMENTS_UI_ENABLED } from "@/lib/features";
import type { Clinic, ClinicPackage, ClinicServiceOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface ClinicsManagerProps {
  clinics: Clinic[];
}

function ModalSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function CollapsibleModalCard({
  title,
  summary,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-md border bg-muted/15", open && "bg-muted/10")}>
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        {!open && summary ? (
          <span className="max-w-[55%] shrink-0 truncate text-xs text-muted-foreground">
            {summary}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="space-y-3 border-t px-3 py-4">
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

const emptyClinic = {
  name: "",
  address: "",
  phone: "",
  operating_days: [] as string[],
  slots_per_day: 10,
  slots_by_day: {} as Record<string, number>,
  service_catalog: [] as ClinicServiceOption[],
  packages: [] as ClinicPackage[],
  check_in_details: "",
  notes: "",
  is_active: true,
};

export function ClinicsManager({ clinics: initial }: ClinicsManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [form, setForm] = useState(emptyClinic);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(emptyClinic);
    setSaveError(null);
    setDialogOpen(true);
  }

  function openEdit(clinic: Clinic) {
    setEditing(clinic);
    setForm({
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      operating_days: clinic.operating_days,
      slots_per_day: clinic.slots_per_day,
      slots_by_day: clinic.slots_by_day,
      service_catalog: normalizeServiceCatalog(
        clinic.service_catalog,
        clinic.included_services,
        clinic.addon_services
      ),
      packages: clinic.packages ?? [],
      check_in_details: clinic.check_in_details ?? "",
      notes: clinic.notes ?? "",
      is_active: clinic.is_active,
    });
    setSaveError(null);
    setDialogOpen(true);
  }

  async function save() {
    const payload = {
      id: editing?.id,
      ...form,
    };

    setSaveError(null);
    setSaving(true);
    const response = await fetch("/api/clinics/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to save clinic");
      return;
    }

    setDialogOpen(false);
    router.refresh();
  }

  function toggleDay(day: string) {
    setForm({
      ...form,
      operating_days: form.operating_days.includes(day)
        ? form.operating_days.filter((d) => d !== day)
        : [...form.operating_days, day],
    });
  }

  const usesPackagePricing = hasVisibleClinicPackages(form.packages);

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Clinic
        </Button>
      </div>

      <ClinicPartnersTable clinics={initial} onEdit={openEdit} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit clinic" : "Add clinic"}</DialogTitle>
            <DialogDescription>
              Partner clinic details used for Clinic Events booking. Keep this focused on who they
              are, when they&apos;re open, and what they charge.
            </DialogDescription>
          </DialogHeader>

          <div key={editing?.id ?? "new"} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="clinic-name">Name</Label>
              <Input
                id="clinic-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Clinic or hospital name"
              />
            </div>

            <CollapsibleModalCard
              title="Clinic details"
              summary={[form.phone.trim(), form.address.trim()].filter(Boolean).join(" · ") || "Phone & address"}
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="clinic-phone">Phone</Label>
                  <Input
                    id="clinic-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <AddressAutocomplete
                  label="Address"
                  defaultValue={form.address}
                  onAddressChange={(address) => setForm({ ...form, address })}
                  onSelect={(parts) =>
                    setForm({
                      ...form,
                      address: formatAddressPartsLine(parts),
                    })
                  }
                />
              </div>
            </CollapsibleModalCard>

            <ModalSection
              title="Days open"
              description="Which days this partner typically operates."
            >
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    size="sm"
                    variant={form.operating_days.includes(day) ? "default" : "outline"}
                    onClick={() => toggleDay(day)}
                  >
                    {day.slice(0, 3)}
                  </Button>
                ))}
              </div>
              {APPOINTMENTS_UI_ENABLED ? (
                <div className="max-w-[12rem] space-y-1.5 pt-1">
                  <Label htmlFor="clinic-slots">Slots per day</Label>
                  <NumberInput
                    id="clinic-slots"
                    integer
                    min={0}
                    value={form.slots_per_day}
                    onValueChange={(value) => {
                      if (typeof value === "number") setForm({ ...form, slots_per_day: value });
                    }}
                  />
                </div>
              ) : null}
            </ModalSection>

            <ModalSection
              title="Pricing"
              description="Packages and optional extras shown on Clinic Events."
            >
              <ClinicPackagesEditor
                packages={form.packages}
                onChange={(packages) => setForm({ ...form, packages })}
              />
              <ServiceCatalogEditor
                value={form.service_catalog}
                onChange={(service_catalog) => setForm({ ...form, service_catalog })}
                packageMode={usesPackagePricing}
              />
            </ModalSection>

            <CollapsibleModalCard
              title="Visit info"
              summary={
                form.check_in_details.trim() || form.notes.trim()
                  ? "Details added"
                  : "Check-in & notes"
              }
              description="Shown to people booking clinic events when helpful. Internal notes stay staff-only."
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="clinic-check-in">Check-in details</Label>
                  <Textarea
                    id="clinic-check-in"
                    value={form.check_in_details}
                    onChange={(e) => setForm({ ...form, check_in_details: e.target.value })}
                    placeholder="Arrival time, parking, paperwork, fasting…"
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clinic-notes">Internal notes</Label>
                  <Textarea
                    id="clinic-notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Staff-only notes (not shown on the public booking page)"
                    rows={2}
                  />
                </div>
              </div>
            </CollapsibleModalCard>

            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void save()} disabled={saving || !form.name.trim()}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add clinic"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
