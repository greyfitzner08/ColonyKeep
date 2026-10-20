"use client";

import { useState } from "react";
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
import { ClinicHoursEditor, initialSameHours } from "@/components/clinics/clinic-hours-editor";
import { ServiceCatalogEditor } from "@/components/clinics/service-catalog-editor";
import { CollapsibleModalCard, ModalSection } from "@/components/layout/modal-sections";
import { normalizeClinicEmails, normalizeClinicWebsite } from "@/lib/clinics/contact";
import {
  AddressAutocomplete,
  formatAddressPartsLine,
} from "@/components/forms/address-autocomplete";
import {
  CLINIC_WEEKDAYS,
  applySameClinicHours,
  normalizeClinicHours,
  orderedClinicDays,
  pruneClinicHours,
  sharedClinicHours,
  type ClinicHoursByDay,
} from "@/lib/clinics/hours";
import {
  hasVisibleClinicPackages,
  normalizeServiceCatalog,
} from "@/lib/clinics/service-catalog";
import { APPOINTMENTS_UI_ENABLED } from "@/lib/features";
import type { Clinic, ClinicPackage, ClinicServiceOption } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

interface ClinicsManagerProps {
  clinics: Clinic[];
}

const emptyClinic = {
  name: "",
  address: "",
  phone: "",
  emails: [""] as string[],
  website: "",
  operating_days: [] as string[],
  hours_by_day: {} as ClinicHoursByDay,
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
  const [sameHours, setSameHours] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(emptyClinic);
    setSameHours(true);
    setSaveError(null);
    setDialogOpen(true);
  }

  function openEdit(clinic: Clinic) {
    setEditing(clinic);
    setForm({
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      emails: (() => {
        const emails = normalizeClinicEmails(clinic.emails);
        return emails.length > 0 ? emails : [""];
      })(),
      website: clinic.website ?? "",
      operating_days: orderedClinicDays(clinic.operating_days),
      hours_by_day: normalizeClinicHours(clinic.hours_by_day),
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
    setSameHours(initialSameHours(clinic.operating_days, normalizeClinicHours(clinic.hours_by_day)));
    setSaveError(null);
    setDialogOpen(true);
  }

  async function save() {
    const payload = {
      id: editing?.id,
      ...form,
      emails: normalizeClinicEmails(form.emails),
      website: normalizeClinicWebsite(form.website),
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
    const operating_days = orderedClinicDays(
      form.operating_days.includes(day)
        ? form.operating_days.filter((d) => d !== day)
        : [...form.operating_days, day]
    );
    let hours_by_day = pruneClinicHours(operating_days, form.hours_by_day);
    if (sameHours) {
      const shared = sharedClinicHours(form.operating_days, form.hours_by_day);
      hours_by_day = applySameClinicHours(operating_days, shared.open, shared.close);
    }
    setForm({
      ...form,
      operating_days,
      hours_by_day,
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
              summary={
                [
                  form.phone.trim(),
                  normalizeClinicEmails(form.emails)[0],
                  form.website.trim(),
                  form.address.trim(),
                ]
                  .filter(Boolean)
                  .join(" · ") || "Phone, email, website & address"
              }
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
                <div className="space-y-2">
                  <Label>Email addresses</Label>
                  {form.emails.map((email, index) => (
                    <div key={`clinic-email-${index}`} className="flex gap-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(event) => {
                          const emails = [...form.emails];
                          emails[index] = event.target.value;
                          setForm({ ...form, emails });
                        }}
                        placeholder="clinic@example.com"
                      />
                      {form.emails.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove email ${index + 1}`}
                          onClick={() =>
                            setForm({
                              ...form,
                              emails: form.emails.filter((_, emailIndex) => emailIndex !== index),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, emails: [...form.emails, ""] })}
                  >
                    Add email
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clinic-website">Website</Label>
                  <Input
                    id="clinic-website"
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://example.com"
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
              title="Days and hours"
              description="Which days this partner typically operates, and the hours for those days."
            >
              <div className="flex flex-wrap gap-2">
                {CLINIC_WEEKDAYS.map((day) => (
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
              <ClinicHoursEditor
                days={form.operating_days}
                hours={form.hours_by_day}
                sameHours={sameHours}
                onSameHoursChange={setSameHours}
                onHoursChange={(hours_by_day) => setForm({ ...form, hours_by_day })}
              />
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
