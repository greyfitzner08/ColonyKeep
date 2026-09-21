"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, ChevronDown, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ADOPTION_APPLICATION_STATUSES,
  CAT_LIVING_PLANS,
  EMPLOYMENT_STATUSES,
  HOME_ACTIVITY_OPTIONS,
  HOW_HEARD_SOURCES,
  PET_CURRENT_STATUSES,
  REHOME_CIRCUMSTANCES,
  RESIDENCE_TYPES,
  adoptionApplicationStatusLabel,
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

function Answer({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
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

function ScreeningTab({
  answers,
  ranking,
}: {
  answers: AdoptionApplicationAnswers;
  ranking: AdoptionApplicationRankResult;
}) {
  return (
    <div className="space-y-5">
      <section
        className={cn(
          "space-y-3 rounded-lg border p-4",
          ranking.rank === "good" && "border-emerald-200 bg-emerald-50/70",
          ranking.rank === "caution" && "border-amber-200 bg-amber-50/70",
          ranking.rank === "poor" && "border-red-200 bg-red-50/70"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold tracking-tight">Screening flags</p>
          <RankBadge rank={ranking.rank} badCount={ranking.badCount} />
        </div>
        {ranking.flags.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {ranking.flags.map((flag) => (
              <li key={flag.id}>{flag.label}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No screening answers were flagged. This is not a final adoption decision.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Key screening answers"
          description="Answers that may need follow-up — not a final decision"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Answer label="Lifelong commitment" value={yesLabel(answers.lifelong_commitment)} />
          <Answer label="Rents" value={yesLabel(answers.rents)} />
          <Answer label="Cats approved (if renting)" value={yesLabel(answers.rent_cats_approved)} />
          <Answer label="Allergic to cats" value={yesLabel(answers.allergic_to_cats)} />
          <Answer label="Allergy explanation" value={answers.allergic_explanation} />
          <Answer label="Living plan" value={labelFor(CAT_LIVING_PLANS, answers.living_plan)} />
          <Answer label="Plan to declaw" value={yesLabel(answers.plan_to_declaw)} />
          <Answer
            label="Possible rehome circumstances"
            value={[
              ...answers.rehome_circumstances.map((v) => labelFor(REHOME_CIRCUMSTANCES, v)),
              answers.rehome_other,
            ]
              .filter(Boolean)
              .join(", ")}
          />
          <Answer label="Can pay vet costs" value={yesLabel(answers.can_pay_vet_costs)} />
          <Answer label="Cat is family" value={yesLabel(answers.cat_is_family)} />
        </div>
      </section>
    </div>
  );
}

function DetailsTab({ answers }: { answers: AdoptionApplicationAnswers }) {
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
          <Answer
            label="Landlord"
            value={[answers.landlord_name, answers.landlord_email, answers.landlord_phone]
              .filter(Boolean)
              .join(" · ")}
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
                <div key={index} className="rounded-lg border bg-muted/20 p-3">
                  <p className="mb-3 text-sm font-semibold">Pet #{index + 1}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Answer label="Name" value={pet.name} />
                    <Answer label="Age" value={pet.age} />
                    <Answer label="Year acquired" value={pet.year_acquired} />
                    <Answer label="Type" value={pet.animal_type} />
                    <Answer label="Gender" value={pet.gender} />
                    <Answer
                      label="Status"
                      value={
                        pet.current_status === "other"
                          ? pet.current_status_other || "Other"
                          : labelFor(PET_CURRENT_STATUSES, pet.current_status)
                      }
                    />
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
  defaultOpen = false,
}: {
  application: AdoptionApplication;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const ranking = rankAdoptionApplication(application.answers);
  const answers = application.answers ?? ({} as AdoptionApplicationAnswers);
  const [open, setOpen] = useState(defaultOpen);
  const [status, setStatus] = useState<AdoptionApplicationStatus>(application.status);
  const [staffNotes, setStaffNotes] = useState(application.staff_notes ?? "");
  const [additionalNotes, setAdditionalNotes] = useState(application.additional_notes ?? "");
  const [savedSnapshot, setSavedSnapshot] = useState({
    status: application.status,
    staffNotes: application.staff_notes ?? "",
    additionalNotes: application.additional_notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullName = `${application.applicant_first_name} ${application.applicant_last_name}`.trim();
  const submittedLabel = new Date(application.created_at).toLocaleString();
  const dirty =
    status !== savedSnapshot.status ||
    staffNotes !== savedSnapshot.staffNotes ||
    additionalNotes !== savedSnapshot.additionalNotes;

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
    });
    setJustSaved(true);
    router.refresh();
  }

  function markEdited() {
    if (justSaved) setJustSaved(false);
    if (error) setError(null);
  }

  return (
    <Card className={cn("overflow-hidden", cardToneClass(ranking.rank))}>
      <div className="flex w-full items-start gap-3 px-5 py-4">
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

        <button
          type="button"
          className="min-w-0 flex-1 space-y-2 text-left"
          onClick={() => setOpen((value) => !value)}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xl font-semibold leading-tight tracking-tight">{fullName}</p>
              <p className="text-sm text-muted-foreground">
                Interested in{" "}
                <span className="font-medium text-foreground">{application.cat_interest_name}</span>
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
        </button>

        <div className="flex shrink-0 flex-col items-end gap-2">
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

      {open ? (
        <CardContent className="border-t bg-background/50 pb-5 pt-4">
          <Tabs defaultValue="screening" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
              <TabsTrigger value="screening">Screening</TabsTrigger>
              <TabsTrigger value="details">Full details</TabsTrigger>
              <TabsTrigger value="review">Staff review</TabsTrigger>
            </TabsList>

            <TabsContent value="screening" className="mt-0">
              <ScreeningTab answers={answers} ranking={ranking} />
            </TabsContent>

            <TabsContent value="details" className="mt-0">
              <DetailsTab answers={answers} />
            </TabsContent>

            <TabsContent value="review" className="mt-0 space-y-4">
              <SectionHeading
                title="Internal use only"
                description="Update workflow status and keep staff notes with this application"
              />
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
              <div className="flex items-center justify-end gap-3">
                {justSaved && !dirty ? (
                  <p className="text-sm text-emerald-700">Review saved</p>
                ) : null}
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !dirty}
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
            </TabsContent>
          </Tabs>
        </CardContent>
      ) : null}
    </Card>
  );
}

interface AdoptionApplicationsManagerProps {
  applications: AdoptionApplication[];
}

const OPEN_APPLICATION_STATUSES = new Set<AdoptionApplicationStatus>([
  "pending",
  "in_review",
]);

export function AdoptionApplicationsManager({
  applications: initial,
}: AdoptionApplicationsManagerProps) {
  const [statusFilter, setStatusFilter] = useState("open");
  const [rankFilter, setRankFilter] = useState("all");

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            Defaults to pending and in-review. Colors flag screening answers only — not a final
            adoption decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap">
          <div className="w-full space-y-2 sm:w-auto">
            <Label className="text-sm text-muted-foreground">Workflow status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
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
          <div className="w-full space-y-2 sm:w-auto">
            <Label className="text-sm text-muted-foreground">Screening flags</Label>
            <Select value={rankFilter} onValueChange={setRankFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
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
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No adoption applications match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}
