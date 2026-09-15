"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import {
  ADOPTION_LOCATION_TYPES,
  adoptionLocationTypeLabel,
  type AdoptionLocation,
  type AdoptionLocationType,
} from "@/lib/adoption/constants";

interface AdoptionLocationsManagerProps {
  locations: AdoptionLocation[];
}

type LocationForm = {
  name: string;
  location_type: AdoptionLocationType;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  is_active: boolean;
};

const emptyForm = (): LocationForm => ({
  name: "",
  location_type: "petstore",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
  is_active: true,
});

export function AdoptionLocationsManager({ locations: initial }: AdoptionLocationsManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdoptionLocation | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const columns = useMemo<DataTableColumn<AdoptionLocation>[]>(
    () => [
      {
        id: "name",
        label: "Location",
        sortValue: (row) => row.name,
        render: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {[row.address, row.city, row.state, row.zip].filter(Boolean).join(", ") || "No address"}
            </p>
          </div>
        ),
      },
      {
        id: "type",
        label: "Type",
        sortValue: (row) => row.location_type,
        render: (row) => (
          <Badge variant="secondary">{adoptionLocationTypeLabel(row.location_type)}</Badge>
        ),
      },
      {
        id: "contact",
        label: "Contact",
        render: (row) => (
          <div className="text-sm">
            <p>{row.contact_name || "—"}</p>
            <p className="text-xs text-muted-foreground">
              {[row.contact_phone, row.contact_email].filter(Boolean).join(" · ") || "No contact"}
            </p>
          </div>
        ),
      },
      {
        id: "cats",
        label: "Cats",
        sortValue: (row) => row.cat_count ?? 0,
        render: (row) => row.cat_count ?? 0,
      },
      {
        id: "status",
        label: "Status",
        render: (row) => (
          <Badge variant={row.is_active ? "default" : "outline"}>
            {row.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        label: "",
        render: (row) => (
          <div className="flex justify-end gap-1">
            <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={deletingId === row.id}
              onClick={() => void remove(row)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [deletingId]
  );

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setSaveError(null);
    setDialogOpen(true);
  }

  function openEdit(location: AdoptionLocation) {
    setEditing(location);
    setForm({
      name: location.name,
      location_type: location.location_type,
      contact_name: location.contact_name ?? "",
      contact_phone: location.contact_phone ?? "",
      contact_email: location.contact_email ?? "",
      address: location.address ?? "",
      city: location.city ?? "",
      state: location.state ?? "",
      zip: location.zip ?? "",
      notes: location.notes ?? "",
      is_active: location.is_active,
    });
    setSaveError(null);
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const response = await fetch("/api/adoption/locations/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing?.id, ...form }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to save location");
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  async function remove(location: AdoptionLocation) {
    if (!confirm(`Delete ${location.name}?`)) return;
    setDeletingId(location.id);
    const response = await fetch("/api/adoption/locations/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: location.id }),
    });
    const result = await response.json().catch(() => null);
    setDeletingId(null);
    if (!response.ok) {
      alert(result?.error ?? "Unable to delete location");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add location
        </Button>
      </div>

      <DataTable
        tableId="adoption-locations"
        columns={columns}
        rows={initial}
        getRowKey={(row) => row.id}
        emptyMessage="No adoption locations yet. Add a pet store or foster home."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit location" : "Add location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="PetSmart Charlotte or Foster name"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.location_type}
                onValueChange={(value) =>
                  setForm({ ...form, location_type: value as AdoptionLocationType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADOPTION_LOCATION_TYPES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AddressAutocomplete
              label="Street address"
              defaultValue={form.address}
              onAddressChange={(address) => setForm((current) => ({ ...current, address }))}
              onSelect={(parts) =>
                setForm((current) => ({
                  ...current,
                  address: parts.address,
                  city: parts.city || current.city,
                  state: parts.state || current.state,
                  zip: parts.zip || current.zip,
                }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact name</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contact phone</Label>
                <Input
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact email</Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Hours, cage location, pickup instructions…"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="location-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <Label htmlFor="location-active">Active location</Label>
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save location"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
