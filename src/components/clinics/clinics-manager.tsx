"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceCatalogEditor } from "@/components/clinics/service-catalog-editor";
import { ServiceCatalogDisplay } from "@/components/clinics/service-catalog-display";
import { ClinicPackagesDisplay } from "@/components/clinics/clinic-packages-display";
import {
  defaultIncludedCatalog,
  normalizeServiceCatalog,
} from "@/lib/clinics/service-catalog";
import type { Clinic, ClinicServiceOption } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2 } from "lucide-react";

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
  packages: [] as { name: string; price: number; services: string[] }[],
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

  function togglePackageService(index: number, serviceName: string, checked: boolean) {
    const packages = [...form.packages];
    const pkg = packages[index];
    packages[index] = {
      ...pkg,
      services: checked
        ? [...pkg.services, serviceName]
        : pkg.services.filter((name) => name !== serviceName),
    };
    setForm({ ...form, packages });
  }

  const catalogForForm = normalizeServiceCatalog(form.service_catalog);

  function addPackage() {
    setForm({
      ...form,
      packages: [...form.packages, { name: "", price: 0, services: [] }],
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Clinic</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initial.map((clinic) => (
          <Card key={clinic.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg">{clinic.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{clinic.address}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant={clinic.is_active ? "default" : "secondary"}>
                  {clinic.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => openEdit(clinic)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>{clinic.phone}</p>
              <p><strong>Days:</strong> {clinic.operating_days.join(", ") || "Not set"}</p>
              <p><strong>Slots/day:</strong> {clinic.slots_per_day}</p>
              <ClinicPackagesDisplay
                packages={clinic.packages ?? []}
                catalog={clinic.service_catalog ?? []}
                legacyIncluded={clinic.included_services}
                legacyAddons={clinic.addon_services}
              />
              <ServiceCatalogDisplay
                catalog={clinic.service_catalog ?? []}
                legacyIncluded={clinic.included_services}
                legacyAddons={clinic.addon_services}
                compact
              />
              {clinic.check_in_details && (
                <p className="text-muted-foreground line-clamp-2">{clinic.check_in_details}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Clinic" : "Add Clinic"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
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
            <div className="space-y-2"><Label>Slots per Day</Label><Input type="number" value={form.slots_per_day} onChange={(e) => setForm({ ...form, slots_per_day: parseInt(e.target.value) || 0 })} /></div>

            <ServiceCatalogEditor
              value={form.service_catalog}
              onChange={(service_catalog) => setForm({ ...form, service_catalog })}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Packages</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPackage}>Add package</Button>
              </div>
              {form.packages.map((pkg, index) => (
                <div key={index} className="rounded border p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Package name"
                      value={pkg.name}
                      onChange={(e) => {
                        const packages = [...form.packages];
                        packages[index] = { ...pkg, name: e.target.value };
                        setForm({ ...form, packages });
                      }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      className="w-24"
                      placeholder="Price"
                      value={pkg.price}
                      onChange={(e) => {
                        const packages = [...form.packages];
                        packages[index] = { ...pkg, price: parseFloat(e.target.value) || 0 };
                        setForm({ ...form, packages });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setForm({ ...form, packages: form.packages.filter((_, i) => i !== index) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-normal text-muted-foreground">Services in package</Label>
                    {catalogForForm.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Add services to the catalog above first.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {catalogForForm.map((service) => (
                          <label
                            key={service.name}
                            className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2"
                          >
                            <Checkbox
                              checked={pkg.services.includes(service.name)}
                              onCheckedChange={(checked) =>
                                togglePackageService(index, service.name, !!checked)
                              }
                            />
                            <span className="min-w-0 flex-1 text-sm">{service.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {service.included_in_base ? "Included" : formatCurrency(service.price)}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {form.packages.length > 0 && (
                <ClinicPackagesDisplay
                  packages={form.packages}
                  catalog={form.service_catalog}
                />
              )}
            </div>

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
