"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  VACCINATION_TYPES,
  appendVaccination,
  applyVetCareDueUpdate,
  emptyEntranceAnswers,
  upcomingVetCareAlerts,
  vaccinationFromVetCareService,
  vaccinationListError,
  vetCareDueTimingLabel,
  type AdoptionEntranceApplication,
  type VaccinationEntry,
  type VetCareDueAlert,
} from "@/lib/adoption/entrance";

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function applicationAnswers(application: AdoptionEntranceApplication) {
  return { ...emptyEntranceAnswers(), ...application.answers };
}

export function VetCareDueBanner({
  alerts,
  applications,
}: {
  alerts: VetCareDueAlert[];
  applications: AdoptionEntranceApplication[];
}) {
  const router = useRouter();
  const due = useMemo(() => upcomingVetCareAlerts(alerts), [alerts]);
  const [active, setActive] = useState<VetCareDueAlert | null>(null);
  const [dateGiven, setDateGiven] = useState(todayIso());
  const [recordVaccine, setRecordVaccine] = useState(true);
  const [vaccineType, setVaccineType] = useState<VaccinationEntry["type"]>("other");
  const [vaccineOther, setVaccineOther] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [changeDueOnly, setChangeDueOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (due.length === 0) return null;

  function openUpdate(alert: VetCareDueAlert) {
    const guessed = vaccinationFromVetCareService(alert.service);
    setActive(alert);
    setDateGiven(todayIso());
    setRecordVaccine(true);
    setVaccineType(guessed.type);
    setVaccineOther(guessed.other);
    setNextDueDate("");
    setChangeDueOnly(false);
    setError(null);
  }

  function closeUpdate() {
    if (saving) return;
    setActive(null);
    setError(null);
  }

  async function saveUpdate() {
    if (!active) return;
    const application = applications.find((entry) => entry.id === active.applicationId);
    if (!application) {
      setError("Could not find this cat’s rescue record.");
      return;
    }

    const answers = applicationAnswers(application);

    if (changeDueOnly) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) {
        setError("Enter the new due date, or cancel and use Record care given to clear this item.");
        return;
      }
      answers.next_vet_care_due = applyVetCareDueUpdate(
        answers.next_vet_care_due ?? "",
        { service: active.service, date: active.date },
        nextDueDate
      );
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateGiven)) {
        setError("Enter the date care was given.");
        return;
      }
      if (recordVaccine) {
        const entry: VaccinationEntry = {
          type: vaccineType || "other",
          other: vaccineType === "other" ? vaccineOther.trim() || active.service : "",
          date: dateGiven,
        };
        const singleError = vaccinationListError([entry]);
        if (singleError) {
          setError(singleError);
          return;
        }
        const appended = appendVaccination(answers.vaccinations ?? "", entry);
        if (appended.error) {
          setError(appended.error);
          return;
        }
        answers.vaccinations = appended.value;
      }
      answers.next_vet_care_due = applyVetCareDueUpdate(
        answers.next_vet_care_due ?? "",
        { service: active.service, date: active.date },
        nextDueDate.trim() || null
      );
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/adoption/entrance/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: application.id, answers }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to update veterinary care.");
        return;
      }
      setActive(null);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium">Veterinary care due</p>
          <ul className="space-y-1.5">
            {due.map((alert) => (
              <li
                key={`${alert.applicationId}-${alert.service}-${alert.date}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {alert.catName} — {alert.service} ({vetCareDueTimingLabel(alert.date)})
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-amber-300 bg-background/80 text-amber-950 hover:bg-background"
                  onClick={() => openUpdate(alert)}
                >
                  Update
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && closeUpdate()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Update care{active ? ` — ${active.catName}` : ""}
            </DialogTitle>
          </DialogHeader>
          {active ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {active.service} · due {vetCareDueTimingLabel(active.date)} ({active.date})
              </p>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={changeDueOnly}
                  onCheckedChange={(checked) => setChangeDueOnly(checked === true)}
                  disabled={saving}
                />
                <span>Only change the due date (do not record care given)</span>
              </label>

              {changeDueOnly ? (
                <div className="space-y-1.5">
                  <Label htmlFor="vet-care-reschedule">New due date</Label>
                  <Input
                    id="vet-care-reschedule"
                    type="date"
                    value={nextDueDate}
                    disabled={saving}
                    onChange={(event) => setNextDueDate(event.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="vet-care-given">Date given</Label>
                    <Input
                      id="vet-care-given"
                      type="date"
                      value={dateGiven}
                      disabled={saving}
                      onChange={(event) => setDateGiven(event.target.value)}
                    />
                  </div>

                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={recordVaccine}
                      onCheckedChange={(checked) => setRecordVaccine(checked === true)}
                      disabled={saving}
                    />
                    <span>Add to vaccination history</span>
                  </label>

                  {recordVaccine ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Select
                          value={vaccineType || "other"}
                          disabled={saving}
                          onValueChange={(value) =>
                            setVaccineType(value as VaccinationEntry["type"])
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VACCINATION_TYPES.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {vaccineType === "other" ? (
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="vet-care-other">What was it?</Label>
                          <Input
                            id="vet-care-other"
                            value={vaccineOther}
                            maxLength={200}
                            disabled={saving}
                            onChange={(event) => setVaccineOther(event.target.value)}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label htmlFor="vet-care-next">Next due date (optional)</Label>
                    <Input
                      id="vet-care-next"
                      type="date"
                      value={nextDueDate}
                      disabled={saving}
                      onChange={(event) => setNextDueDate(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to clear this reminder after saving.
                    </p>
                  </div>
                </>
              )}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" disabled={saving} onClick={closeUpdate}>
                  Cancel
                </Button>
                <Button type="button" disabled={saving} onClick={() => void saveUpdate()}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
