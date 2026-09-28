"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Pencil, Trash2, Upload } from "lucide-react";
import { FieldControl } from "@/components/adoption/entrance-application-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADOPTABLE_CAT_STATUSES,
  adoptableCatStatusLabel,
  type AdoptableCat,
} from "@/lib/adoption/constants";
import {
  ENTRANCE_SECTIONS,
  emptyEntranceAnswers,
  applyEntranceAnswer,
  entranceFieldLabel,
  entranceFieldSpansRow,
  showEntranceField,
  type AdoptionEntranceApplication,
  type EntranceAnswers,
} from "@/lib/adoption/entrance";

interface AdoptableCatsManagerProps {
  cats: AdoptableCat[];
  applications: AdoptionEntranceApplication[];
}

function answersFor(
  application: AdoptionEntranceApplication,
  drafts: Record<string, EntranceAnswers>
): EntranceAnswers {
  return drafts[application.id] ?? { ...emptyEntranceAnswers(), ...application.answers };
}

function genderLabel(value: string | null | undefined): string {
  if (value === "female") return "Female";
  if (value === "male") return "Male";
  if (value === "unknown") return "Unknown";
  return "";
}

function catAgeLabel(answers: EntranceAnswers | undefined, row: AdoptableCat): string {
  const dob = answers?.date_of_birth?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const born = new Date(`${dob}T12:00:00`);
    if (!Number.isNaN(born.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - born.getFullYear();
      const beforeBirthday =
        now.getMonth() < born.getMonth() ||
        (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
      if (beforeBirthday) years -= 1;
      if (years >= 1) return years === 1 ? "1 year" : `${years} years`;
      let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
      if (now.getDate() < born.getDate()) months -= 1;
      if (months >= 1) return months === 1 ? "1 month" : `${months} months`;
      return "Under 1 month";
    }
  }
  return answers?.estimated_age?.trim() || row.age_description?.trim() || "";
}

function locationSummary(answers: EntranceAnswers | undefined): { foster: string; store: string } {
  const foster = answers?.location_name?.trim() || "";
  const store = answers?.at_pet_store === "yes" ? answers.pet_store_name?.trim() || "" : "";
  return { foster, store };
}

export function AdoptableCatsManager({ cats: initial, applications }: AdoptableCatsManagerProps) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdoptableCat | null>(null);
  const [sectionId, setSectionId] = useState(ENTRANCE_SECTIONS[0]?.id ?? "profile");
  const [drafts, setDrafts] = useState<Record<string, EntranceAnswers>>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const recordByCatId = useMemo(() => {
    const byCat = new Map<string, AdoptionEntranceApplication>();
    for (const application of applications) {
      if (application.adoptable_cat_id && application.status === "approved") {
        byCat.set(application.adoptable_cat_id, application);
      }
    }
    return byCat;
  }, [applications]);

  const rows = useMemo(() => {
    if (statusFilter === "all") return initial;
    return initial.filter((cat) => cat.status === statusFilter);
  }, [initial, statusFilter]);

  const editingRecord = editing ? recordByCatId.get(editing.id) ?? null : null;

  const columns = useMemo<DataTableColumn<AdoptableCat>[]>(
    () => [
      {
        id: "name",
        label: "Cat",
        sortValue: (row) => row.name,
        render: (row) => {
          const record = recordByCatId.get(row.id);
          const age = catAgeLabel(record?.answers, row);
          const gender = genderLabel(record?.answers.gender || row.sex);
          const details = [age, gender].filter(Boolean).join(" · ");
          return (
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
                <p className="font-medium">{record?.answers.new_name || row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {details || "Age and gender not listed"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        label: "Status",
        sortValue: (row) => row.status,
        render: (row) => {
          const label = recordByCatId.get(row.id)?.answers.current_status || adoptableCatStatusLabel(row.status);
          return <Badge variant="secondary">{label}</Badge>;
        },
      },
      {
        id: "location",
        label: "Location",
        render: (row) => {
          const answers = recordByCatId.get(row.id)?.answers;
          const { foster, store } = locationSummary(answers);
          if (!foster && !store) {
            return <span className="text-muted-foreground">Unassigned</span>;
          }
          return (
            <div className="text-sm">
              <p className="font-medium">{foster || "Foster home"}</p>
              {store ? <p className="text-xs text-muted-foreground">Pet store · {store}</p> : null}
            </div>
          );
        },
      },
      {
        id: "profile",
        label: "Profile",
        render: (row) => {
          const personality = recordByCatId.get(row.id)?.answers.personality || row.personality_notes;
          return (
            <p className="max-w-xs truncate text-xs text-muted-foreground">
              {personality || "No personality notes yet"}
            </p>
          );
        },
      },
      {
        id: "actions",
        label: "Actions",
        render: (row) => (
          <div className="flex justify-end gap-1">
            <Button type="button" size="icon" variant="ghost" onClick={() => openRecord(row)}>
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
    [deletingId, recordByCatId]
  );

  function openRecord(cat: AdoptableCat) {
    setEditing(cat);
    setPhotoUrl(cat.profile_photo_url);
    setSectionId(ENTRANCE_SECTIONS[0]?.id ?? "profile");
    setSaveError(null);
    setSaved(false);
    setDialogOpen(true);
  }

  function updateAnswer(application: AdoptionEntranceApplication, key: string, value: string) {
    const base = answersFor(application, drafts);
    setSaved(false);
    setDrafts((current) => ({
      ...current,
      [application.id]: applyEntranceAnswer(current[application.id] ?? base, key, value),
    }));
  }

  async function uploadPhoto(file: File) {
    if (!editing) return;
    setUploadingPhoto(true);
    setSaveError(null);
    const data = new FormData();
    data.append("file", file);
    data.append("cat_id", editing.id);
    const response = await fetch("/api/adoption/cats/photo", { method: "POST", body: data });
    const result = await response.json().catch(() => null);
    setUploadingPhoto(false);
    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to upload photo");
      return;
    }
    setPhotoUrl(typeof result?.profile_photo_url === "string" ? result.profile_photo_url : null);
    router.refresh();
  }

  async function clearPhoto() {
    if (!editing) return;
    setUploadingPhoto(true);
    setSaveError(null);
    const response = await fetch("/api/adoption/cats/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        name: editing.name,
        age_description: editing.age_description,
        sex: editing.sex,
        status: editing.status,
        profile_photo_url: null,
        spayed_neutered: editing.spayed_neutered,
        vaccinated: editing.vaccinated,
        vaccination_notes: editing.vaccination_notes,
        fiv_status: editing.fiv_status,
        felv_status: editing.felv_status,
        fip_status: editing.fip_status,
        medical_notes: editing.medical_notes,
        personality_notes: editing.personality_notes,
        notes: editing.notes,
      }),
    });
    const result = await response.json().catch(() => null);
    setUploadingPhoto(false);
    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to remove photo");
      return;
    }
    setPhotoUrl(null);
    router.refresh();
  }

  async function saveRecord() {
    if (!editingRecord) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/adoption/entrance/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRecord.id,
          answers: answersFor(editingRecord, drafts),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setSaveError(result?.error ?? "Unable to save this cat.");
        return;
      }
      if (result?.answers) {
        setDrafts((current) => ({ ...current, [editingRecord.id]: result.answers }));
      }
      setSaved(true);
      router.refresh();
    } catch {
      setSaveError("Network error — check your connection and try again.");
    } finally {
      setSaving(false);
    }
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

  const answers = editingRecord ? answersFor(editingRecord, drafts) : null;
  const section = ENTRANCE_SECTIONS.find((entry) => entry.id === sectionId) ?? ENTRANCE_SECTIONS[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[9.5rem]" aria-label="Status">
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
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" size="sm" variant="ghost" className="h-8 px-2.5" asChild>
            <Link href="/adopt" target="_blank" title="Public form for a person who wants to adopt">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Adoption application
            </Link>
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 px-2.5" asChild>
            <Link
              href="/adoption-entrance"
              target="_blank"
              title="Public form for a cat joining the program"
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Rescue application
            </Link>
          </Button>
        </div>
      </div>

      <DataTable
        tableId="adoptable-cats"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyMessage="No cats yet. Cats appear here after a rescue application is approved."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.name ?? "Cat record"}</DialogTitle>
          </DialogHeader>
          {editing && answers && editingRecord && section ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={editing.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadPhoto(file);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingPhoto ? "Uploading…" : photoUrl ? "Replace photo" : "Upload photo"}
                  </Button>
                  {photoUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={uploadingPhoto}
                      onClick={() => void clearPhoto()}
                    >
                      Remove photo
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {ENTRANCE_SECTIONS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`rounded-full border px-2 py-1 text-xs ${
                      section.id === entry.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-transparent bg-muted text-muted-foreground"
                    }`}
                    onClick={() => setSectionId(entry.id)}
                  >
                    {entry.title}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.map((field) => {
                  if (!showEntranceField(field, answers)) return null;
                  return (
                  <div
                    key={field.key}
                    className={entranceFieldSpansRow(field) ? "space-y-2 sm:col-span-2" : "space-y-2"}
                  >
                    <Label htmlFor={`entrance-${editingRecord.id}-${field.key}`}>
                      {entranceFieldLabel(field, answers)}
                      {field.key === "pet_store_name" ? " *" : ""}
                      {field.staff && !field.submittedStamp ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">Portal only</span>
                      ) : null}
                    </Label>
                    {field.submittedStamp ? (
                      <p className="text-sm">
                        {new Date(editingRecord.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    ) : (
                      <FieldControl
                        field={{ ...field, key: `${editingRecord.id}-${field.key}` }}
                        value={answers[field.key] ?? ""}
                        invalid={false}
                        onChange={(value) => updateAnswer(editingRecord, field.key, value)}
                      />
                    )}
                  </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" disabled={saving} onClick={() => void saveRecord()}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
                {saved && !saveError ? <p className="text-sm text-muted-foreground">Saved</p> : null}
                {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This cat does not have a rescue application record yet.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
