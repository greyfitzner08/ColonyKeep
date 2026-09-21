"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PageControlBar } from "@/components/layout/page-control-bar";
import {
  ADOPTABLE_CAT_SEXES,
  ADOPTABLE_CAT_STATUSES,
  DISEASE_TEST_STATUSES,
  FIP_STATUSES,
  adoptableCatStatusLabel,
  adoptionLocationTypeLabel,
  formatAdoptionLocationLine,
  type AdoptableCat,
  type AdoptableCatSex,
  type AdoptableCatStatus,
  type AdoptionLocation,
  type DiseaseTestStatus,
  type FipStatus,
} from "@/lib/adoption/constants";

interface AdoptableCatsManagerProps {
  cats: AdoptableCat[];
  locations: AdoptionLocation[];
}

type CatForm = {
  name: string;
  age_description: string;
  sex: AdoptableCatSex | "";
  status: AdoptableCatStatus;
  location_id: string;
  profile_photo_url: string;
  spayed_neutered: boolean | null;
  vaccinated: boolean | null;
  vaccination_notes: string;
  fiv_status: DiseaseTestStatus;
  felv_status: DiseaseTestStatus;
  fip_status: FipStatus;
  medical_notes: string;
  personality_notes: string;
  notes: string;
};

const NONE = "__none__";

const emptyForm = (): CatForm => ({
  name: "",
  age_description: "",
  sex: "",
  status: "available",
  location_id: "",
  profile_photo_url: "",
  spayed_neutered: null,
  vaccinated: null,
  vaccination_notes: "",
  fiv_status: "unknown",
  felv_status: "unknown",
  fip_status: "unknown",
  medical_notes: "",
  personality_notes: "",
  notes: "",
});

function yesNoUnknown(value: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Unknown";
}

export function AdoptableCatsManager({ cats: initial, locations }: AdoptableCatsManagerProps) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdoptableCat | null>(null);
  const [form, setForm] = useState<CatForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const activeLocations = locations.filter(
    (location) => location.is_active || location.id === form.location_id
  );

  const rows = useMemo(() => {
    if (statusFilter === "all") return initial;
    return initial.filter((cat) => cat.status === statusFilter);
  }, [initial, statusFilter]);

  const columns = useMemo<DataTableColumn<AdoptableCat>[]>(
    () => [
      {
        id: "name",
        label: "Cat",
        sortValue: (row) => row.name,
        render: (row) => (
          <div className="flex items-center gap-3">
            {row.profile_photo_url ? (
              <Image
                src={row.profile_photo_url}
                alt={row.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                —
              </div>
            )}
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-xs text-muted-foreground">
                {[row.age_description, row.sex ? row.sex : null].filter(Boolean).join(" · ") ||
                  "Age/sex not set"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "status",
        label: "Status",
        sortValue: (row) => row.status,
        render: (row) => <Badge variant="secondary">{adoptableCatStatusLabel(row.status)}</Badge>,
      },
      {
        id: "location",
        label: "Location",
        render: (row) =>
          row.location ? (
            <div className="text-sm">
              <p className="font-medium">{row.location.name}</p>
              <p className="text-xs text-muted-foreground">
                {adoptionLocationTypeLabel(row.location.location_type)}
                {row.location.city ? ` · ${row.location.city}` : ""}
              </p>
            </div>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          ),
      },
      {
        id: "medical",
        label: "Medical",
        render: (row) => (
          <div className="text-xs space-y-0.5">
            <p>S/N: {yesNoUnknown(row.spayed_neutered)}</p>
            <p>Vax: {yesNoUnknown(row.vaccinated)}</p>
            <p>
              FIV {row.fiv_status} · FeLV {row.felv_status} · FIP {row.fip_status}
            </p>
          </div>
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

  function openEdit(cat: AdoptableCat) {
    setEditing(cat);
    setForm({
      name: cat.name,
      age_description: cat.age_description ?? "",
      sex: cat.sex ?? "",
      status: cat.status,
      location_id: cat.location_id ?? "",
      profile_photo_url: cat.profile_photo_url ?? "",
      spayed_neutered: cat.spayed_neutered,
      vaccinated: cat.vaccinated,
      vaccination_notes: cat.vaccination_notes ?? "",
      fiv_status: cat.fiv_status,
      felv_status: cat.felv_status,
      fip_status: cat.fip_status,
      medical_notes: cat.medical_notes ?? "",
      personality_notes: cat.personality_notes ?? "",
      notes: cat.notes ?? "",
    });
    setSaveError(null);
    setDialogOpen(true);
  }

  async function uploadPhoto(file: File) {
    setUploadingPhoto(true);
    setSaveError(null);
    const data = new FormData();
    data.append("file", file);
    if (editing?.id) data.append("cat_id", editing.id);
    const response = await fetch("/api/adoption/cats/photo", {
      method: "POST",
      body: data,
    });
    const result = await response.json().catch(() => null);
    setUploadingPhoto(false);
    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to upload photo");
      return;
    }
    setForm((prev) => ({ ...prev, profile_photo_url: result.profile_photo_url ?? "" }));
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const response = await fetch("/api/adoption/cats/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        ...form,
        sex: form.sex || null,
        location_id: form.location_id || null,
        profile_photo_url: form.profile_photo_url || null,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to save cat");
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  async function remove(cat: AdoptableCat) {
    if (!confirm(`Remove ${cat.name} from the adoption list?`)) return;
    setDeletingId(cat.id);
    const response = await fetch("/api/adoption/cats/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id }),
    });
    const result = await response.json().catch(() => null);
    setDeletingId(null);
    if (!response.ok) {
      alert(result?.error ?? "Unable to delete cat");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PageControlBar
        activeFilterCount={statusFilter !== "all" ? 1 : 0}
        filters={
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ADOPTABLE_CAT_STATUSES.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/adoption/locations">
                <MapPin className="mr-1.5 h-4 w-4" />
                Locations
              </Link>
            </Button>
            <Button type="button" size="sm" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add cat
            </Button>
          </>
        }
      />

      <DataTable
        tableId="adoptable-cats"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyMessage="No adoptable cats yet. Add a cat to start the adoption roster."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit adoptable cat" : "Add adoptable cat"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <section className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-semibold">Profile photo</p>
              <div className="flex items-center gap-4">
                {form.profile_photo_url ? (
                  <Image
                    src={form.profile_photo_url}
                    alt={form.name || "Cat photo"}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
                    No photo
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadPhoto(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingPhoto
                      ? "Uploading…"
                      : form.profile_photo_url
                        ? "Replace photo"
                        : "Upload photo"}
                  </Button>
                  {form.profile_photo_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, profile_photo_url: "" })}
                    >
                      Remove photo
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    One profile photo. JPEG, PNG, WebP, or GIF up to 5MB.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-semibold">Cat details</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    placeholder="e.g. 2 years, 4 months"
                    value={form.age_description}
                    onChange={(e) => setForm({ ...form, age_description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sex</Label>
                  <Select
                    value={form.sex || NONE}
                    onValueChange={(value) =>
                      setForm({ ...form, sex: value === NONE ? "" : (value as AdoptableCatSex) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unknown / not set</SelectItem>
                      {ADOPTABLE_CAT_SEXES.map((entry) => (
                        <SelectItem key={entry.value} value={entry.value}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm({ ...form, status: value as AdoptableCatStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADOPTABLE_CAT_STATUSES.map((entry) => (
                        <SelectItem key={entry.value} value={entry.value}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select
                    value={form.location_id || NONE}
                    onValueChange={(value) =>
                      setForm({ ...form, location_id: value === NONE ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {activeLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {formatAdoptionLocationLine(location)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {locations.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      <Link href="/adoption/locations" className="text-primary underline">
                        Add a location
                      </Link>{" "}
                      first to place this cat.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-semibold">Medical records</p>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.spayed_neutered === true}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        spayed_neutered: checked === true ? true : checked === false ? false : null,
                      })
                    }
                  />
                  Spayed / neutered
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.vaccinated === true}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        vaccinated: checked === true ? true : checked === false ? false : null,
                      })
                    }
                  />
                  Vaccinated
                </label>
              </div>
              <div className="space-y-2">
                <Label>Vaccination notes</Label>
                <Input
                  placeholder="FVRCP, rabies dates…"
                  value={form.vaccination_notes}
                  onChange={(e) => setForm({ ...form, vaccination_notes: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>FIV</Label>
                  <Select
                    value={form.fiv_status}
                    onValueChange={(value) =>
                      setForm({ ...form, fiv_status: value as DiseaseTestStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISEASE_TEST_STATUSES.map((entry) => (
                        <SelectItem key={entry.value} value={entry.value}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>FeLV</Label>
                  <Select
                    value={form.felv_status}
                    onValueChange={(value) =>
                      setForm({ ...form, felv_status: value as DiseaseTestStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISEASE_TEST_STATUSES.map((entry) => (
                        <SelectItem key={entry.value} value={entry.value}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>FIP</Label>
                  <Select
                    value={form.fip_status}
                    onValueChange={(value) => setForm({ ...form, fip_status: value as FipStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIP_STATUSES.map((entry) => (
                        <SelectItem key={entry.value} value={entry.value}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Medical notes</Label>
                <Textarea
                  rows={3}
                  value={form.medical_notes}
                  onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
                  placeholder="Treatments, special needs, vet history…"
                />
              </div>
            </section>

            <section className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-semibold">Notes</p>
              <div className="space-y-2">
                <Label>Personality / temperament</Label>
                <Textarea
                  rows={2}
                  value={form.personality_notes}
                  onChange={(e) => setForm({ ...form, personality_notes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>General notes</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </section>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void save()} disabled={saving || uploadingPhoto}>
                {saving ? "Saving…" : "Save cat"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
