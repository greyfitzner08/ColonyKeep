"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, ChevronDown, Copy, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CardsTableToggle,
  type CardsTableViewMode,
} from "@/components/ui/cards-table-toggle";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
  ADOPTION_APPLICATION_ANSWER_COLUMNS,
  ADOPTION_APPLICATION_STATUSES,
  CAT_LIVING_PLANS,
  EMPLOYMENT_STATUSES,
  HOME_ACTIVITY_OPTIONS,
  HOW_HEARD_SOURCES,
  PET_CURRENT_STATUSES,
  REHOME_CIRCUMSTANCES,
  RESIDENCE_TYPES,
  adoptionApplicationStatusLabel,
  formatAdoptionAnswerColumn,
  isDogPetType,
  petGenderLabel,
  petTypeLabel,
  type AdoptionApplication,
  type AdoptionApplicationAnswers,
  type AdoptionApplicationStatus,
} from "@/lib/adoption/application";
import {
  ADOPTION_APPLICATION_RANKS,
  adoptionApplicationRankLabel,
  adoptionApplicationRankShortLabel,
  adoptionApplicationRankSortValue,
  rankAdoptionApplication,
  type AdoptionApplicationRank,
  type AdoptionApplicationRankResult,
} from "@/lib/adoption/rank";
import { cn } from "@/lib/utils";

function labelFor(
  options: { value: string; label: string }[],
  value: string | null | undefined
): string {
  if (!value) return "—";
  return options.find((entry) => entry.value === value)?.label ?? value;
}

function yesLabel(value: string | null | undefined): string {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "unsure") return "Unsure";
  if (value === "not_applicable") return "Not applicable";
  return value || "—";
}

function RankBadge({ rank, badCount }: { rank: AdoptionApplicationRank; badCount: number }) {
  const styles: Record<AdoptionApplicationRank, string> = {
    good: "border-transparent bg-emerald-100 text-emerald-900",
    caution: "border-transparent bg-amber-100 text-amber-950",
    poor: "border-transparent bg-red-100 text-red-900",
  };

  return (
    <Badge variant="outline" className={styles[rank]}>
      {adoptionApplicationRankLabel(rank)}
      {badCount > 0 ? ` · ${badCount}` : ""}
    </Badge>
  );
}

function cardToneClass(rank: AdoptionApplicationRank): string {
  if (rank === "good") return "border-emerald-200/80 bg-emerald-50/40";
  if (rank === "caution") return "border-amber-200/80 bg-amber-50/40";
  return "border-red-200/80 bg-red-50/40";
}

type AnswerHighlight = "flag" | "yellow" | undefined;

function Answer({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string | null;
  highlight?: AnswerHighlight;
}) {
  return (
    <div
      className={cn(
        "space-y-0.5 rounded-md",
        highlight === "flag" && "border border-red-200 bg-red-50/80 p-2.5",
        highlight === "yellow" && "border border-amber-200 bg-amber-50/80 p-2.5"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {highlight ? (
          <span
            className={cn(
              "ml-1.5 normal-case tracking-normal",
              highlight === "yellow" ? "text-amber-800" : "text-red-800"
            )}
          >
            · flagged
          </span>
        ) : null}
      </p>
      <p className="text-sm whitespace-pre-wrap">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-0.5 border-b pb-2">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 shrink-0 gap-1 px-2 text-xs"
      aria-label={`Copy ${email}`}
      title="Copy email"
      onClick={(event) => {
        event.stopPropagation();
        void copyEmail();
      }}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-primary" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </Button>
  );
}

function flagTone(
  ranking: AdoptionApplicationRankResult,
  id: string
): AnswerHighlight {
  const flag = ranking.flags.find((entry) => entry.id === id);
  if (!flag) return undefined;
  return flag.tone === "yellow" ? "yellow" : "flag";
}

function ApplicationDetails({
  answers,
  ranking,
}: {
  answers: AdoptionApplicationAnswers;
  ranking: AdoptionApplicationRankResult;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeading title="Interest & housing" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Answer
            label="How heard"
            value={
              answers.how_heard === "other"
                ? answers.how_heard_other || "Other"
                : labelFor(HOW_HEARD_SOURCES, answers.how_heard)
            }
          />
          <Answer
            label="Lifelong commitment"
            value={yesLabel(answers.lifelong_commitment)}
            highlight={flagTone(ranking, "lifelong_commitment")}
          />
          <Answer label="Housemate" value={answers.housemate_name} />
          <Answer
            label="Address"
            value={[answers.address_line_1, answers.address_line_2, answers.city, answers.state]
              .filter(Boolean)
              .join(", ")}
          />
          <Answer
            label="Residence type"
            value={
              answers.residence_type === "other"
                ? answers.residence_type_other || "Other"
                : labelFor(RESIDENCE_TYPES, answers.residence_type)
            }
          />
          <Answer label="Rents" value={yesLabel(answers.rents)} />
          <Answer
            label="Cats approved (if renting)"
            value={yesLabel(answers.rent_cats_approved)}
            highlight={flagTone(ranking, "rent_cats_approved")}
          />
          <Answer
            label="Landlord"
            value={[answers.landlord_name, answers.landlord_email, answers.landlord_phone]
              .filter(Boolean)
              .join(" · ")}
          />
          <Answer
            label="Allergic to cats"
            value={yesLabel(answers.allergic_to_cats)}
            highlight={flagTone(ranking, "allergic_to_cats")}
          />
          <Answer label="Allergy explanation" value={answers.allergic_explanation} />
          <Answer
            label="Living plan"
            value={labelFor(CAT_LIVING_PLANS, answers.living_plan)}
            highlight={flagTone(ranking, "living_plan")}
          />
          <Answer
            label="Plan to declaw"
            value={yesLabel(answers.plan_to_declaw)}
            highlight={flagTone(ranking, "plan_to_declaw")}
          />
          <Answer
            label="Possible rehome circumstances"
            value={[
              ...answers.rehome_circumstances.map((v) => labelFor(REHOME_CIRCUMSTANCES, v)),
              answers.rehome_other,
            ]
              .filter(Boolean)
              .join(", ")}
            highlight={flagTone(ranking, "rehome_circumstances")}
          />
          <Answer
            label="Can pay vet costs"
            value={yesLabel(answers.can_pay_vet_costs)}
            highlight={flagTone(ranking, "can_pay_vet_costs")}
          />
          <Answer
            label="Cat is family"
            value={yesLabel(answers.cat_is_family)}
            highlight={flagTone(ranking, "cat_is_family")}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Household" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Answer
            label="Employment"
            value={
              answers.employment_status === "other"
                ? answers.employment_status_other || "Other"
                : labelFor(EMPLOYMENT_STATUSES, answers.employment_status)
            }
          />
          <Answer label="Employer" value={answers.employer} />
          <Answer label="Age range" value={answers.age_range} />
          <Answer label="Adults in home" value={answers.adults_in_home} />
          <Answer label="Adults work outside home" value={yesLabel(answers.adults_work_outside)} />
          <Answer label="Children" value={answers.children_in_home} />
          <Answer
            label="Activity level"
            value={[
              ...answers.activity_levels.map((v) => labelFor(HOME_ACTIVITY_OPTIONS, v)),
              answers.activity_other,
            ]
              .filter(Boolean)
              .join(", ")}
          />
          <Answer label="Hours alone / day" value={answers.hours_alone} />
          <Answer label="Backup caregiver" value={answers.backup_caregiver} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Pet history & references" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Answer label="Pets in last 5 years" value={yesLabel(answers.had_pets_last_five_years)} />
          <Answer
            label="Veterinarian"
            value={[answers.vet_practice_name, answers.vet_name, answers.vet_phone]
              .filter(Boolean)
              .join(" · ")}
          />
          <Answer label="Never had pet — vet plan" value={answers.never_had_pet_vet_plan} />
          <Answer
            label="Reference 1"
            value={[
              answers.reference_1_name,
              answers.reference_1_relationship,
              answers.reference_1_email,
              answers.reference_1_phone,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <Answer
            label="Reference 2"
            value={[
              answers.reference_2_name,
              answers.reference_2_relationship,
              answers.reference_2_email,
              answers.reference_2_phone,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <Answer label="Final comments" value={answers.final_comments} />
        </div>

        {(answers.pets ?? []).some((pet) => pet.name || pet.animal_type) ? (
          <div className="space-y-3 pt-2">
            {(answers.pets ?? []).map((pet, index) =>
              pet.name || pet.animal_type ? (
                <div
                  key={index}
                  className={cn(
                    "rounded-lg border bg-muted/20 p-3",
                    (isDogPetType(pet.animal_type) ||
                      (pet.current_status === "in_home" && pet.spayed_neutered === "no")) &&
                      "border-amber-300 bg-amber-50"
                  )}
                >
                  <p className="mb-3 text-sm font-semibold">
                    Pet #{index + 1}
                    {isDogPetType(pet.animal_type) ||
                    (pet.current_status === "in_home" && pet.spayed_neutered === "no") ? (
                      <span className="ml-1.5 font-normal text-amber-800">· flagged</span>
                    ) : null}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Answer label="Name" value={pet.name} />
                    <Answer label="Age" value={pet.age} />
                    <Answer label="Year acquired" value={pet.year_acquired} />
                    <Answer
                      label="Pet type"
                      value={petTypeLabel(pet)}
                      highlight={isDogPetType(pet.animal_type) ? "yellow" : undefined}
                    />
                    <Answer label="Gender" value={petGenderLabel(pet.gender)} />
                    <Answer
                      label="Status"
                      value={
                        pet.current_status === "other"
                          ? pet.current_status_other || "Other"
                          : labelFor(PET_CURRENT_STATUSES, pet.current_status)
                      }
                    />
                    {pet.current_status === "in_home" && (
                      <Answer
                        label="Spayed / neutered"
                        value={yesLabel(pet.spayed_neutered)}
                        highlight={pet.spayed_neutered === "no" ? "yellow" : undefined}
                      />
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ApplicationCard({
  application,
  cats,
  mode = "list",
  onClose,
  onDeleted,
}: {
  application: AdoptionApplication;
  cats: { id: string; name: string }[];
  /** list = expandable card stack; panel = always-open review pane under the table */
  mode?: "list" | "panel";
  onClose?: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const ranking = rankAdoptionApplication(application.answers);
  const answers = application.answers ?? ({} as AdoptionApplicationAnswers);
  const [open, setOpen] = useState(mode === "panel");
  const [status, setStatus] = useState<AdoptionApplicationStatus>(application.status);
  const [staffNotes, setStaffNotes] = useState(application.staff_notes ?? "");
  const [additionalNotes, setAdditionalNotes] = useState(application.additional_notes ?? "");
  const [catId, setCatId] = useState(application.cat_id ?? "none");
  const [savedSnapshot, setSavedSnapshot] = useState({
    status: application.status,
    staffNotes: application.staff_notes ?? "",
    additionalNotes: application.additional_notes ?? "",
    catId: application.cat_id ?? "none",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fullName = `${application.applicant_first_name} ${application.applicant_last_name}`.trim();
  const submittedLabel = new Date(application.created_at).toLocaleString();
  const dirty =
    status !== savedSnapshot.status ||
    staffNotes !== savedSnapshot.staffNotes ||
    additionalNotes !== savedSnapshot.additionalNotes ||
    catId !== savedSnapshot.catId;
  const linkedCat = cats.find((cat) => cat.id === catId);
  const showBody = mode === "panel" || open;

  useEffect(() => {
    if (mode !== "panel") return;
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [mode, application.id]);

  async function save() {
    setSaving(true);
    setJustSaved(false);
    setError(null);
    const response = await fetch("/api/adoption/applications/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: application.id,
        status,
        staff_notes: staffNotes,
        additional_notes: additionalNotes,
        cat_id: catId === "none" ? null : catId,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setError(result?.error ?? "Unable to update application");
      return;
    }
    setSavedSnapshot({
      status,
      staffNotes,
      additionalNotes,
      catId,
    });
    setJustSaved(true);
    router.refresh();
  }

  async function removeApplication() {
    const label = fullName || application.applicant_email || "this application";
    if (
      !confirm(
        `Delete the adoption application from ${label}? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    const response = await fetch("/api/adoption/applications/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: application.id }),
    });
    const result = await response.json().catch(() => null);
    setDeleting(false);
    if (!response.ok) {
      setError(result?.error ?? "Unable to delete application");
      return;
    }
    onDeleted?.();
    router.refresh();
  }

  function markEdited() {
    if (justSaved) setJustSaved(false);
    if (error) setError(null);
  }

  return (
    <Card
      ref={panelRef}
      id={mode === "panel" ? "adoption-application-review" : undefined}
      className={cn("overflow-hidden", cardToneClass(ranking.rank))}
    >
      <div className="flex w-full items-start gap-3 px-5 py-4">
        {mode === "list" ? (
          <button
            type="button"
            className="mt-1 shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-background/60"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Collapse application" : "Expand application"}
          >
            <ChevronDown
              className={cn("h-5 w-5 transition-transform", open && "rotate-180")}
            />
          </button>
        ) : null}

        <div
          className={cn("min-w-0 flex-1 space-y-2 text-left", mode === "list" && "cursor-pointer")}
          onClick={mode === "list" ? () => setOpen((value) => !value) : undefined}
          onKeyDown={
            mode === "list"
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setOpen((value) => !value);
                  }
                }
              : undefined
          }
          role={mode === "list" ? "button" : undefined}
          tabIndex={mode === "list" ? 0 : undefined}
        >
          {mode === "panel" ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reviewing below
            </p>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xl font-semibold leading-tight tracking-tight">{fullName}</p>
              <p className="text-sm text-muted-foreground">
                Wrote{" "}
                <span className="font-medium text-foreground">{application.cat_interest_name}</span>
                {linkedCat ? ` · linked to ${linkedCat.name}` : " · not linked to a cat yet"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RankBadge rank={ranking.rank} badCount={ranking.badCount} />
              <Badge variant="secondary">{adoptionApplicationStatusLabel(status)}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{application.applicant_phone}</span>
            <span className="hidden sm:inline">·</span>
            <span>Submitted {submittedLabel}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {mode === "panel" && onClose ? (
            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              <X className="mr-1 h-4 w-4" />
              Close review
            </Button>
          ) : null}
          {application.cat?.profile_photo_url ? (
            <Image
              src={application.cat.profile_photo_url}
              alt={application.cat_interest_name}
              width={56}
              height={56}
              className="hidden h-14 w-14 rounded-full object-cover sm:block"
            />
          ) : null}
          <div className="flex max-w-[240px] items-start gap-2">
            <a
              href={`mailto:${application.applicant_email}`}
              className="break-all text-sm text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {application.applicant_email}
            </a>
            <CopyEmailButton email={application.applicant_email} />
          </div>
        </div>
      </div>

      {showBody ? (
        <CardContent className="space-y-8 border-t bg-background/50 pb-5 pt-4">
          <ApplicationDetails answers={answers} ranking={ranking} />

          <section className="space-y-4 border-t pt-6">
            <SectionHeading
              title="Staff review"
              description="Update workflow status, link a cat, and keep internal notes"
            />
            <div className="space-y-2">
              <Label>Cat this application is for</Label>
              <p className="text-sm text-muted-foreground">
                The name they typed stays “{application.cat_interest_name}”. Choose the cat in the
                program when the spelling is off or they want a different cat. Their household
                answers stay on this application.
              </p>
              <Select
                value={cats.some((cat) => cat.id === catId) ? catId : "none"}
                onValueChange={(value) => {
                  markEdited();
                  setCatId(value);
                }}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked yet</SelectItem>
                  {cats.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  markEdited();
                  setStatus(value as AdoptionApplicationStatus);
                }}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADOPTION_APPLICATION_STATUSES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Staff notes</Label>
              <Textarea
                rows={3}
                value={staffNotes}
                onChange={(e) => {
                  markEdited();
                  setStaffNotes(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Additional notes</Label>
              <Textarea
                rows={3}
                value={additionalNotes}
                onChange={(e) => {
                  markEdited();
                  setAdditionalNotes(e.target.value);
                }}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="destructive"
                disabled={saving || deleting}
                onClick={() => void removeApplication()}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                {deleting ? "Deleting…" : "Delete application"}
              </Button>
              <div className="flex items-center gap-3">
                {justSaved && !dirty ? (
                  <p className="text-sm text-emerald-700">Review saved</p>
                ) : null}
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || deleting || !dirty}
                  variant={justSaved && !dirty ? "outline" : "default"}
                  className={cn(
                    justSaved &&
                      !dirty &&
                      "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-50"
                  )}
                >
                  {saving ? (
                    "Saving…"
                  ) : justSaved && !dirty ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    "Save review"
                  )}
                </Button>
              </div>
            </div>
          </section>
        </CardContent>
      ) : null}
    </Card>
  );
}

interface AdoptionApplicationsManagerProps {
  applications: AdoptionApplication[];
  cats: { id: string; name: string }[];
}

const OPEN_APPLICATION_STATUSES = new Set<AdoptionApplicationStatus>([
  "pending",
  "in_review",
]);

export function AdoptionApplicationsManager({
  applications: initial,
  cats,
}: AdoptionApplicationsManagerProps) {
  const [statusFilter, setStatusFilter] = useState("open");
  const [rankFilter, setRankFilter] = useState("all");
  const [viewMode, setViewMode] = useState<CardsTableViewMode>("table");
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const filtered = initial.filter((row) => {
      if (statusFilter === "open") {
        if (!OPEN_APPLICATION_STATUSES.has(row.status)) return false;
      } else if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      if (rankFilter !== "all") {
        const rank = rankAdoptionApplication(row.answers).rank;
        if (rank !== rankFilter) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const rankA = rankAdoptionApplication(a.answers);
      const rankB = rankAdoptionApplication(b.answers);
      const rankDiff =
        adoptionApplicationRankSortValue(rankA.rank) -
        adoptionApplicationRankSortValue(rankB.rank);
      if (rankDiff !== 0) return rankDiff;
      if (rankA.badCount !== rankB.badCount) return rankA.badCount - rankB.badCount;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [initial, statusFilter, rankFilter]);

  const counts = useMemo(() => {
    const next = { good: 0, caution: 0, poor: 0 };
    for (const row of initial) {
      if (!OPEN_APPLICATION_STATUSES.has(row.status)) continue;
      next[rankAdoptionApplication(row.answers).rank] += 1;
    }
    return next;
  }, [initial]);

  const focused = focusedId ? rows.find((row) => row.id === focusedId) ?? null : null;

  const columns = useMemo<DataTableColumn<AdoptionApplication>[]>(() => {
    const core: DataTableColumn<AdoptionApplication>[] = [
      {
        id: "applicant",
        label: "Applicant",
        hideable: false,
        sortValue: (row) =>
          `${row.applicant_last_name} ${row.applicant_first_name}`.trim().toLowerCase(),
        render: (row) => (
          <div>
            <p className="font-medium">
              {`${row.applicant_first_name} ${row.applicant_last_name}`.trim()}
            </p>
            <p className="text-xs text-muted-foreground">{row.applicant_email}</p>
          </div>
        ),
      },
      {
        id: "cat",
        label: "Cat interest",
        sortValue: (row) => row.cat_interest_name,
        render: (row) => {
          const linked = cats.find((cat) => cat.id === row.cat_id);
          return (
            <div>
              <p className="font-medium">{row.cat_interest_name}</p>
              <p className="text-xs text-muted-foreground">
                {linked ? `Linked · ${linked.name}` : "Not linked"}
              </p>
            </div>
          );
        },
      },
      {
        id: "rank",
        label: "Screening",
        sortValue: (row) =>
          adoptionApplicationRankSortValue(rankAdoptionApplication(row.answers).rank),
        render: (row) => {
          const ranking = rankAdoptionApplication(row.answers);
          return <RankBadge rank={ranking.rank} badCount={ranking.badCount} />;
        },
      },
      {
        id: "status",
        label: "Status",
        sortValue: (row) => row.status,
        render: (row) => (
          <Badge variant="secondary">{adoptionApplicationStatusLabel(row.status)}</Badge>
        ),
      },
      {
        id: "submitted",
        label: "Submitted",
        sortValue: (row) => row.created_at,
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.created_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "phone",
        label: "Phone",
        sortValue: (row) => row.applicant_phone,
        render: (row) => <span className="text-sm">{row.applicant_phone || "—"}</span>,
      },
      {
        id: "email",
        label: "Email",
        defaultHidden: true,
        sortValue: (row) => row.applicant_email,
        render: (row) => <span className="text-sm">{row.applicant_email || "—"}</span>,
      },
      {
        id: "first_name",
        label: "First name",
        defaultHidden: true,
        sortValue: (row) => row.applicant_first_name,
        render: (row) => <span className="text-sm">{row.applicant_first_name || "—"}</span>,
      },
      {
        id: "last_name",
        label: "Last name",
        defaultHidden: true,
        sortValue: (row) => row.applicant_last_name,
        render: (row) => <span className="text-sm">{row.applicant_last_name || "—"}</span>,
      },
      {
        id: "linked_cat",
        label: "Linked cat",
        defaultHidden: true,
        sortValue: (row) => cats.find((cat) => cat.id === row.cat_id)?.name ?? "",
        render: (row) => {
          const linked = cats.find((cat) => cat.id === row.cat_id);
          return <span className="text-sm">{linked?.name || "—"}</span>;
        },
      },
      {
        id: "staff_notes",
        label: "Staff notes",
        defaultHidden: true,
        defaultWidth: 220,
        wrap: true,
        sortValue: (row) => row.staff_notes ?? "",
        render: (row) => (
          <span className="whitespace-pre-wrap text-sm">{row.staff_notes?.trim() || "—"}</span>
        ),
      },
      {
        id: "additional_notes",
        label: "Additional notes",
        defaultHidden: true,
        defaultWidth: 220,
        wrap: true,
        sortValue: (row) => row.additional_notes ?? "",
        render: (row) => (
          <span className="whitespace-pre-wrap text-sm">
            {row.additional_notes?.trim() || "—"}
          </span>
        ),
      },
      {
        id: "reviewed_at",
        label: "Reviewed",
        defaultHidden: true,
        sortValue: (row) => row.reviewed_at ?? "",
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        id: "updated",
        label: "Updated",
        defaultHidden: true,
        sortValue: (row) => row.updated_at,
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.updated_at).toLocaleDateString()}
          </span>
        ),
      },
    ];

    const answerColumns: DataTableColumn<AdoptionApplication>[] =
      ADOPTION_APPLICATION_ANSWER_COLUMNS.map((field) => ({
        id: `answer_${field.key}`,
        label: field.label,
        labelText: field.label,
        defaultHidden: true,
        defaultWidth:
          field.key === "pets" ||
          field.key === "final_comments" ||
          field.key === "allergic_explanation" ||
          field.key === "never_had_pet_vet_plan"
            ? 220
            : 140,
        wrap:
          field.key === "pets" ||
          field.key === "final_comments" ||
          field.key === "allergic_explanation" ||
          field.key === "never_had_pet_vet_plan" ||
          field.key === "rehome_circumstances" ||
          field.key === "activity_levels",
        sortValue: (row) => formatAdoptionAnswerColumn(row.answers, field.key).toLowerCase(),
        render: (row) => {
          const value = formatAdoptionAnswerColumn(row.answers, field.key);
          if (!value) return <span className="text-muted-foreground">—</span>;
          return <span className="text-sm whitespace-pre-wrap">{value}</span>;
        },
      }));

    const actions: DataTableColumn<AdoptionApplication> = {
      id: "actions",
      label: "Actions",
      hideable: false,
      render: (row) => {
        const isFocused = focusedId === row.id;
        return (
          <Button
            type="button"
            size="sm"
            variant={isFocused ? "secondary" : "outline"}
            onClick={() => setFocusedId((current) => (current === row.id ? null : row.id))}
          >
            {isFocused ? "Close review" : "Review below"}
          </Button>
        );
      },
    };

    return [...core, ...answerColumns, actions];
  }, [cats, focusedId]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["good", counts.good],
            ["caution", counts.caution],
            ["poor", counts.poor],
          ] as const
        ).map(([rank, count]) => (
          <button
            key={rank}
            type="button"
            onClick={() => setRankFilter((current) => (current === rank ? "all" : rank))}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              cardToneClass(rank),
              rankFilter === rank && "ring-2 ring-primary/40"
            )}
          >
            <p className="text-2xl font-semibold tracking-tight">{count}</p>
            <p className="text-sm font-medium">{adoptionApplicationRankShortLabel(rank)}</p>
            <p className="text-xs text-muted-foreground">{adoptionApplicationRankLabel(rank)}</p>
          </button>
        ))}
      </div>

      <PageControlBar
        activeFilterCount={(statusFilter !== "open" ? 1 : 0) + (rankFilter !== "all" ? 1 : 0)}
        filtersLabel="Filters"
        filters={
          <>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-medium text-muted-foreground">Workflow status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Pending / In review</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ADOPTION_APPLICATION_STATUSES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-medium text-muted-foreground">Screening flags</Label>
              <Select value={rankFilter} onValueChange={setRankFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ranks</SelectItem>
                  {ADOPTION_APPLICATION_RANKS.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        }
        actions={<CardsTableToggle value={viewMode} onChange={setViewMode} />}
        meta={
          <>
            {rows.length} application{rows.length === 1 ? "" : "s"} · screening colors are flags, not
            decisions
          </>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No adoption applications match these filters.
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="space-y-3">
          {rows.map((application) => (
            <ApplicationCard key={application.id} application={application} cats={cats} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <DataTable
            tableId="adoption-applications"
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            getRowClassName={(row) =>
              focusedId === row.id ? "bg-primary/5" : undefined
            }
            emptyMessage="No adoption applications match these filters."
          />
          {focused ? (
            <ApplicationCard
              key={focused.id}
              application={focused}
              cats={cats}
              mode="panel"
              onClose={() => setFocusedId(null)}
              onDeleted={() => setFocusedId(null)}
            />
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Choose <span className="font-medium text-foreground">Review below</span> on a row to
              open the full application under this table.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
