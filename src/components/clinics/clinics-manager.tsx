"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClinicPartnersTable } from "@/components/clinics/clinic-partners-table";
import { ClinicPackagesEditor } from "@/components/clinics/clinic-packages-editor";
import { ServiceCatalogEditor } from "@/components/clinics/service-catalog-editor";
import {
  AddressAutocomplete,
  formatAddressPartsLine,
} from "@/components/forms/address-autocomplete";
import {
  defaultIncludedCatalog,
  hasVisibleClinicPackages,
  normalizeServiceCatalog,
} from "@/lib/clinics/service-catalog";
import type { Clinic, ClinicPackage, ClinicServiceOption } from "@/lib/types";
import { Plus } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface ClinicsManagerProps {
  clinics: Clinic[];
}

const emptyClinic = {
  name: "",
  address: "",
  phone: "",
  operating_days: [] as string[],
  slots_per_day: 10,
  slots_by_day: {} as Record<string, number>,
  service_catalog: defaultIncludedCatalog() as ClinicServiceOption[],
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
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Clinic</Button>
      </div>

      <ClinicPartnersTable clinics={initial} onEdit={openEdit} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Clinic" : "Add Clinic"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
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
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Operating Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <Button key={day} type="button" size="sm" variant={form.operating_days.includes(day) ? "default" : "outline"} onClick={() => toggleDay(day)}>
                    {day.slice(0, 3)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Slots per Day</Label>
              <NumberInput
                integer
                min={0}
                value={form.slots_per_day}
                onValueChange={(value) => {
                  if (typeof value === "number") setForm({ ...form, slots_per_day: value });
                }}
              />
            </div>

            <ClinicPackagesEditor
              packages={form.packages}
              onChange={(packages) => setForm({ ...form, packages })}
            />

            <ServiceCatalogEditor
              value={form.service_catalog}
              onChange={(service_catalog) => setForm({ ...form, service_catalog })}
              packageMode={usesPackagePricing}
            />

            <div className="space-y-2">
              <Label>Check-in details</Label>
              <Textarea
                value={form.check_in_details}
                onChange={(e) => setForm({ ...form, check_in_details: e.target.value })}
                placeholder="Arrival time, parking, paperwork, fasting instructions…"
                rows={4}
              />
            </div>

            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <Button onClick={save} className="w-full" disabled={saving}>
              {saving ? "Saving..." : "Save Clinic"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
