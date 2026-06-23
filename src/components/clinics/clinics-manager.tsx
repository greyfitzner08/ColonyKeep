"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Clinic } from "@/lib/types";
import { Plus, Pencil } from "lucide-react";

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
  included_services: [] as string[],
  packages: [] as { name: string; price: number; services: string[] }[],
  addon_services: [] as { name: string; price: number }[],
  notes: "",
  is_active: true,
};

export function ClinicsManager({ clinics: initial }: ClinicsManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [form, setForm] = useState(emptyClinic);
  const [servicesInput, setServicesInput] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(emptyClinic);
    setServicesInput("");
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
      included_services: clinic.included_services,
      packages: clinic.packages,
      addon_services: clinic.addon_services,
      notes: clinic.notes ?? "",
      is_active: clinic.is_active,
    });
    setServicesInput(clinic.included_services.join(", "));
    setSaveError(null);
    setDialogOpen(true);
  }

  async function save() {
    const payload = {
      id: editing?.id,
      ...form,
      included_services: servicesInput.split(",").map((s) => s.trim()).filter(Boolean),
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
            <CardContent className="text-sm space-y-2">
              <p>{clinic.phone}</p>
              <p><strong>Days:</strong> {clinic.operating_days.join(", ") || "Not set"}</p>
              <p><strong>Slots/day:</strong> {clinic.slots_per_day}</p>
              {clinic.included_services.length > 0 && (
                <p><strong>Services:</strong> {clinic.included_services.join(", ")}</p>
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
            <div className="space-y-2"><Label>Included Services (comma-separated)</Label><Input value={servicesInput} onChange={(e) => setServicesInput(e.target.value)} placeholder="Spay/Neuter, Rabies Vaccine, Ear Tip" /></div>
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
