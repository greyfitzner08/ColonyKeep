"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Pencil, Trash2, Upload } from "lucide-react";
import { AdoptableCatImporter } from "@/components/adoption/adoptable-cat-importer";
import { FieldControl } from "@/components/adoption/entrance-application-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CardsTableToggle,
  type CardsTableViewMode,
} from "@/components/ui/cards-table-toggle";
import { Checkbox } from "@/components/ui/checkbox";
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
  adoptionApplicationStatusLabel,
  adoptionReviewFromApplication,
  type AdoptionApplicationLink,
} from "@/lib/adoption/application";
import {
  ADOPTABLE_CAT_STATUSES,
  adoptableCatStatusLabel,
  type AdoptableCat,
  type AdoptableCatStatus,
} from "@/lib/adoption/constants";
import {
  ENTRANCE_FIELDS,
  ENTRANCE_SECTIONS,
  emptyEntranceAnswers,
  applyEntranceAddress,
  applyEntranceAnswer,
  entranceFieldGroupClass,
  entranceFieldGroups,
  entranceFieldLabel,
  entranceFieldSpansRow,
  entranceOptionLabel,
  petStoreDisplayName,
  type AdoptionEntranceApplication,
  type EntranceAnswers,
} from "@/lib/adoption/entrance";

interface AdoptableCatsManagerProps {
  cats: AdoptableCat[];
  applications: AdoptionEntranceApplication[];
  adoptionApplications: AdoptionApplicationLink[];
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

const DEFAULT_STATUS_FILTERS = new Set(
  ADOPTABLE_CAT_STATUSES.filter((entry) => entry.value !== "adopted").map((entry) => entry.value)
);

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
  const foster = answers?.foster_name?.trim() || answers?.location_contact_name?.trim() || answers?.location_name?.trim() || "";
  const store = petStoreDisplayName(answers);
  return { foster, store };
}

export function AdoptableCatsManager({
  cats: initial,
  applications,
  adoptionApplications,
}: AdoptableCatsManagerProps) {
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
  const [statusFilters, setStatusFilters] = useState<Set<AdoptableCatStatus>>(
    () => new Set(DEFAULT_STATUS_FILTERS)
  );
  const [viewMode, setViewMode] = useState<CardsTableViewMode>("table");
  const [relinkApplicationId, setRelinkApplicationId] = useState<string | null>(null);

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
    if (statusFilters.size === 0) return [];
    return initial.filter((cat) => statusFilters.has(cat.status));
  }, [initial, statusFilters]);

  function toggleStatusFilter(status: AdoptableCatStatus, checked: boolean) {
    setStatusFilters((current) => {
      const next = new Set(current);
      if (checked) next.add(status);
      else next.delete(status);
      return next;
    });
  }

  const editingRecord = editing ? recordByCatId.get(editing.id) ?? null : null;

  const columns = useMemo<DataTableColumn<AdoptableCat>[]>(() => {
    const answerValue = (row: AdoptableCat, key: string) =>
      recordByCatId.get(row.id)?.answers?.[key]?.trim() ?? "";

    const core: DataTableColumn<AdoptableCat>[] = [
      {
        id: "name",
        label: "Cat",
        hideable: false,
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
          const label =
            recordByCatId.get(row.id)?.answers.current_status || adoptableCatStatusLabel(row.status);
          return <Badge variant="secondary">{label}</Badge>;
        },
      },
      {
        id: "location",
        label: "Location",
        sortValue: (row) => {
          const { foster, store } = locationSummary(recordByCatId.get(row.id)?.answers);
          return [foster, store].filter(Boolean).join(" ");
        },
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
        id: "pet_store_rank",
        label: "Rank",
        defaultWidth: 120,
        sortValue: (row) => {
          const raw = answerValue(row, "pet_store_rank");
          if (!raw) return Number.POSITIVE_INFINITY;
          const parsed = Number(raw);
          return Number.isFinite(parsed) ? parsed : raw.toLowerCase();
        },
        render: (row) => {
          const answers = recordByCatId.get(row.id)?.answers;
          if (answers?.approved_pet_store !== "yes") {
            return <span className="text-muted-foreground">—</span>;
          }
          const rank = answers.pet_store_rank?.trim() || "";
          return <span className="font-medium tabular-nums">{rank || "—"}</span>;
        },
      },
      {
        id: "profile",
        label: "Profile",
        defaultHidden: true,
        render: (row) => {
          const personality = recordByCatId.get(row.id)?.answers.personality || row.personality_notes;
          return (
            <p className="max-w-xs truncate text-xs text-muted-foreground">
              {personality || "No personality notes yet"}
            </p>
          );
        },
      },
    ];

    const skipKeys = new Set([
      "linked_adoption_application_id",
      "cat_name",
      "current_status",
      "personality",
      "pet_store_rank",
    ]);

    const fieldColumns: DataTableColumn<AdoptableCat>[] = ENTRANCE_FIELDS.filter(
      (field) => !field.hidden && !field.submittedStamp && !skipKeys.has(field.key)
    ).map((field) => ({
      id: `field_${field.key}`,
      label: field.label,
      labelText: field.label,
      defaultHidden: true,
      defaultWidth: field.kind === "textarea" || field.kind === "vaccinations" || field.kind === "vet_care" ? 220 : 140,
      wrap: field.kind === "textarea",
      sortValue: (row) => answerValue(row, field.key).toLowerCase(),
      render: (row) => {
        const value = answerValue(row, field.key);
        if (!value) return <span className="text-muted-foreground">—</span>;
        return (
          <span className={field.kind === "textarea" ? "whitespace-pre-wrap text-sm" : "text-sm"}>
            {entranceOptionLabel(field.key, value)}
          </span>
        );
      },
    }));

    const actions: DataTableColumn<AdoptableCat> = {
      id: "actions",
      label: "Actions",
      hideable: false,
      defaultWidth: 100,
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
    };

    return [...core, ...fieldColumns, actions];
  }, [deletingId, recordByCatId]);

  function openRecord(cat: AdoptableCat) {
    setEditing(cat);
    setPhotoUrl(cat.profile_photo_url);
    setSectionId(ENTRANCE_SECTIONS[0]?.id ?? "profile");
    setSaveError(null);
    setSaved(false);
    setRelinkApplicationId(null);
    setDialogOpen(true);
  }

  function chooseAdoptionApplication(record: AdoptionEntranceApplication, applicationId: string) {
    setSaved(false);
    setRelinkApplicationId(applicationId === "none" ? "" : applicationId);
    const base = answersFor(record, drafts);
    if (applicationId === "none") {
      setDrafts((current) => ({
        ...current,
        [record.id]: applyEntranceAnswer(
          current[record.id] ?? base,
          "linked_adoption_application_id",
          ""
        ),
      }));
      return;
    }
    const application = adoptionApplications.find((entry) => entry.id === applicationId);
    if (!application) return;
    const filled = adoptionReviewFromApplication(application);
    setDrafts((current) => ({
      ...current,
      [record.id]: { ...(current[record.id] ?? base), ...filled },
    }));
  }

  function updateAddress(
    application: AdoptionEntranceApplication,
    key: string,
    parts: { address: string; city: string; state: string; zip: string }
  ) {
    const base = answersFor(application, drafts);
    setSaved(false);
    setDrafts((current) => ({
      ...current,
      [application.id]: applyEntranceAddress(current[application.id] ?? base, key, parts),
    }));
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
    if (typeof result?.profile_photo_url === "string") {
      const url = result.profile_photo_url;
      setEditing((current) => (current ? { ...current, profile_photo_url: url } : current));
    }
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
      if (relinkApplicationId && editing) {
        const linkResponse = await fetch("/api/adoption/applications/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: relinkApplicationId, cat_id: editing.id }),
        });
        const linkResult = await linkResponse.json().catch(() => null);
        if (!linkResponse.ok) {
          setSaveError(
            linkResult?.error ?? "The review was saved, but the application could not be linked to this cat."
          );
          return;
        }
        setRelinkApplicationId(null);
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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" role="group" aria-label="Status filters">
            {ADOPTABLE_CAT_STATUSES.map((entry) => {
              const id = `adoptable-status-${entry.value}`;
              const checked = statusFilters.has(entry.value);
              return (
                <label
                  key={entry.value}
                  htmlFor={id}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(value) => toggleStatusFilter(entry.value, value === true)}
                  />
                  <span>{entry.label}</span>
                </label>
              );
            })}
          </div>
          <CardsTableToggle value={viewMode} onChange={setViewMode} />
        </div>
        <AdoptableCatImporter>
          <Button
            type="button"
            size="sm"
            className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/adopt" target="_blank" title="Public form for a person who wants to adopt">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Adoption application
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 bg-sidebar text-sidebar-foreground hover:bg-sidebar/80"
            asChild
          >
            <Link
              href="/adoption-entrance"
              target="_blank"
              title="Public form for a cat joining the program"
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Rescue application
            </Link>
          </Button>
        </AdoptableCatImporter>
      </div>

      {viewMode === "table" ? (
        <DataTable
          tableId="adoptable-cats-profile"
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          defaultSort={{ columnId: "pet_store_rank", direction: "asc" }}
          emptyMessage={
            statusFilters.size === 0
              ? "Select at least one status to show cats."
              : "No cats match these status filters."
          }
        />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {statusFilters.size === 0
            ? "Select at least one status to show cats."
            : "No cats match these status filters."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const record = recordByCatId.get(row.id);
            const age = catAgeLabel(record?.answers, row);
            const gender = genderLabel(record?.answers.gender || row.sex);
            const details = [age, gender].filter(Boolean).join(" · ");
            const statusLabel =
              record?.answers.current_status || adoptableCatStatusLabel(row.status);
            const { foster, store } = locationSummary(record?.answers);
            return (
              <Card key={row.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
                  {row.profile_photo_url ? (
                    <Image
                      src={row.profile_photo_url}
                      alt={row.name}
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="text-base leading-tight">
                      {record?.answers.new_name || row.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {details || "Age and gender not listed"}
                    </p>
                    <Badge variant="secondary">{statusLabel}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="text-sm">
                    <p className="font-medium">{foster || store ? foster || "Foster home" : "Unassigned"}</p>
                    {store ? (
                      <p className="text-xs text-muted-foreground">Pet store · {store}</p>
                    ) : null}
                    {record?.answers.approved_pet_store === "yes" ? (
                      <p className="text-xs text-muted-foreground">
                        Rank {record.answers.pet_store_rank?.trim() || "—"}
                      </p>
                    ) : null}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {record?.answers.personality || row.personality_notes || "No personality notes yet"}
                  </p>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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

              {section.id === "adoption_review" ? (
                <div className="space-y-2">
                  <Label>Adoption application</Label>
                  <p className="text-sm text-muted-foreground">
                    Optional. Choosing an application copies that person’s name, phone, email, address, date, and
                    status into the fields below, and those fields stay editable. An adopter with no online
                    application can be typed in with this left blank. Saving attaches the chosen application to
                    this cat. The name they typed stays on their application.
                  </p>
                  <Select
                    value={answers.linked_adoption_application_id || "none"}
                    onValueChange={(value) => chooseAdoptionApplication(editingRecord, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No application" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No application — enter the adopter below</SelectItem>
                      {adoptionApplications
                        .filter(
                          (application) =>
                            application.cat_id === editing.id ||
                            !application.cat_id ||
                            application.id === answers.linked_adoption_application_id
                        )
                        .map((application) => {
                          const name =
                            `${application.applicant_first_name} ${application.applicant_last_name}`.trim();
                          const wrote = application.cat_interest_name.trim() || "no name written";
                          const elsewhere =
                            application.cat_id && application.cat_id !== editing.id
                              ? ` · linked to ${application.cat?.name || "another cat"}`
                              : !application.cat_id
                                ? " · not linked yet"
                                : "";
                          return (
                            <SelectItem key={application.id} value={application.id}>
                              {name} · wrote {wrote} · {adoptionApplicationStatusLabel(application.status)}
                              {elsewhere}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-4">
                {entranceFieldGroups(section.fields, answers).map((group) => (
                  <div key={group.heading || group.fields[0]?.key} className={entranceFieldGroupClass(group.heading)}>
                    {group.heading ? <h3 className="text-base font-semibold">{group.heading}</h3> : null}
                    <div className="grid gap-4 sm:grid-cols-2">
                {group.fields.map((field) => (
                  <div
                    key={field.key}
                    className={entranceFieldSpansRow(field) ? "space-y-2 sm:col-span-2" : "space-y-2"}
                  >
                    <Label htmlFor={`entrance-${editingRecord.id}-${field.key}`}>
                      {entranceFieldLabel(field, answers)}
                      {field.key === "pet_store_name" ||
                      field.key === "pet_store_other_name" ||
                      field.key === "fff_volunteer_name"
                        ? " *"
                        : ""}
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
                        onAddressSelect={(parts) => updateAddress(editingRecord, field.key, parts)}
                      />
                    )}
                  </div>
                ))}
                    </div>
                  </div>
                ))}
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
