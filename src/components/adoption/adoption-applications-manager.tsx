"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye } from "lucide-react";
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
  adoptionApplicationRankLabel,
  adoptionApplicationRankSortValue,
  rankAdoptionApplication,
  type AdoptionApplicationRank,
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
      {badCount > 0 ? ` (${badCount})` : ""}
    </Badge>
  );
}

function rowHighlightClass(rank: AdoptionApplicationRank): string {
  if (rank === "good") return "bg-emerald-50/80";
  if (rank === "caution") return "bg-amber-50/80";
  return "bg-red-50/80";
}

function Answer({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

function AnswersPanel({ answers }: { answers: AdoptionApplicationAnswers }) {
  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-3">
        <h3 className="font-semibold">Adoption interest</h3>
        <Answer
          label="How heard"
          value={
            answers.how_heard === "other"
              ? answers.how_heard_other || "Other"
              : labelFor(HOW_HEARD_SOURCES, answers.how_heard)
          }
        />
        <Answer label="Lifelong commitment" value={yesLabel(answers.lifelong_commitment)} />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Residence</h3>
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
        <Answer label="Cats approved (if renting)" value={yesLabel(answers.rent_cats_approved)} />
        <Answer
          label="Landlord"
          value={[answers.landlord_name, answers.landlord_email, answers.landlord_phone]
            .filter(Boolean)
            .join(" · ")}
        />
        <Answer label="Housemate" value={answers.housemate_name} />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Household</h3>
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
        <Answer label="Allergic to cats" value={yesLabel(answers.allergic_to_cats)} />
        <Answer label="Allergy explanation" value={answers.allergic_explanation} />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Cat care</h3>
        <Answer label="Living plan" value={labelFor(CAT_LIVING_PLANS, answers.living_plan)} />
        <Answer label="Plan to declaw" value={yesLabel(answers.plan_to_declaw)} />
        <Answer label="Hours alone / day" value={answers.hours_alone} />
        <Answer label="Backup caregiver" value={answers.backup_caregiver} />
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
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Pet history</h3>
        <Answer label="Pets in last 5 years" value={yesLabel(answers.had_pets_last_five_years)} />
        <Answer
          label="Veterinarian"
          value={[answers.vet_practice_name, answers.vet_name, answers.vet_phone]
            .filter(Boolean)
            .join(" · ")}
        />
        <Answer label="Never had pet — vet plan" value={answers.never_had_pet_vet_plan} />
        {(answers.pets ?? []).map((pet, index) => (
          <div key={index} className="rounded-md border p-3 space-y-2">
            <p className="font-medium">Pet #{index + 1}</p>
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
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">References</h3>
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
      </section>
    </div>
  );
}

interface AdoptionApplicationsManagerProps {
  applications: AdoptionApplication[];
}

export function AdoptionApplicationsManager({
  applications: initial,
}: AdoptionApplicationsManagerProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<AdoptionApplication | null>(null);
  const [status, setStatus] = useState<AdoptionApplicationStatus>("pending");
  const [staffNotes, setStaffNotes] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? initial
        : initial.filter((row) => row.status === statusFilter);

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
  }, [initial, statusFilter]);

  const columns = useMemo<DataTableColumn<AdoptionApplication>[]>(
    () => [
      {
        id: "rank",
        label: "Auto rank",
        sortValue: (row) =>
          adoptionApplicationRankSortValue(rankAdoptionApplication(row.answers).rank),
        render: (row) => {
          const result = rankAdoptionApplication(row.answers);
          return <RankBadge rank={result.rank} badCount={result.badCount} />;
        },
      },
      {
        id: "applicant",
        label: "Applicant",
        sortValue: (row) => `${row.applicant_last_name} ${row.applicant_first_name}`,
        render: (row) => (
          <div>
            <p className="font-medium">
              {row.applicant_first_name} {row.applicant_last_name}
            </p>
            <p className="text-xs text-muted-foreground">{row.applicant_email}</p>
          </div>
        ),
      },
      {
        id: "cat",
        label: "Cat interest",
        sortValue: (row) => row.cat_interest_name,
        render: (row) => (
          <div className="flex items-center gap-2">
            {row.cat?.profile_photo_url ? (
              <Image
                src={row.cat.profile_photo_url}
                alt={row.cat_interest_name}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : null}
            <span>{row.cat_interest_name}</span>
          </div>
        ),
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
            {new Date(row.created_at).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        label: "",
        render: (row) => (
          <div className="flex justify-end">
            <Button type="button" size="icon" variant="ghost" onClick={() => open(row)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  function open(row: AdoptionApplication) {
    setSelected(row);
    setStatus(row.status);
    setStaffNotes(row.staff_notes ?? "");
    setAdditionalNotes(row.additional_notes ?? "");
    setError(null);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/adoption/applications/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
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
    setSelected(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ADOPTION_APPLICATION_STATUSES.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        tableId="adoption-applications"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        getRowClassName={(row) =>
          rowHighlightClass(rankAdoptionApplication(row.answers).rank)
        }
        emptyMessage="No adoption applications yet."
        defaultSort={{ columnId: "rank", direction: "asc" }}
      />

      <Dialog open={!!selected} onOpenChange={(openState) => !openState && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected
                ? `${selected.applicant_first_name} ${selected.applicant_last_name} — ${selected.cat_interest_name}`
                : "Application"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              {(() => {
                const ranking = rankAdoptionApplication(selected.answers);
                return (
                  <section
                    className={cn(
                      "space-y-3 rounded-lg border p-4",
                      ranking.rank === "good" && "border-emerald-200 bg-emerald-50/70",
                      ranking.rank === "caution" && "border-amber-200 bg-amber-50/70",
                      ranking.rank === "poor" && "border-red-200 bg-red-50/70"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">Auto rank</p>
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
                        No flagged answers on the screening questions.
                      </p>
                    )}
                  </section>
                );
              })()}

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <Answer label="Email" value={selected.applicant_email} />
                <Answer label="Phone" value={selected.applicant_phone} />
                <Answer
                  label="Submitted"
                  value={new Date(selected.created_at).toLocaleString()}
                />
                <Answer label="Cat interest" value={selected.cat_interest_name} />
              </div>

              <AnswersPanel answers={selected.answers ?? ({} as AdoptionApplicationAnswers)} />

              <section className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-semibold">Internal use only</p>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as AdoptionApplicationStatus)}
                  >
                    <SelectTrigger>
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
                    onChange={(e) => setStaffNotes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Additional notes</Label>
                  <Textarea
                    rows={3}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                  />
                </div>
              </section>

              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button type="button" onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
