"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emptyEntranceAnswers,
  upcomingAdoptionFollowUpAlerts,
  vetCareDueTimingLabel,
  type AdoptionEntranceApplication,
  type AdoptionFollowUpAlert,
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

export function AdoptionFollowUpBanner({
  alerts,
  applications,
}: {
  alerts: AdoptionFollowUpAlert[];
  applications: AdoptionEntranceApplication[];
}) {
  const router = useRouter();
  const due = useMemo(() => upcomingAdoptionFollowUpAlerts(alerts), [alerts]);
  const [active, setActive] = useState<AdoptionFollowUpAlert | null>(null);
  const [completedOn, setCompletedOn] = useState(todayIso());
  const [nextDueDate, setNextDueDate] = useState("");
  const [changeDueOnly, setChangeDueOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (due.length === 0) return null;

  function openUpdate(alert: AdoptionFollowUpAlert) {
    setActive(alert);
    setCompletedOn(todayIso());
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
        setError("Enter the new due date, or cancel and mark the follow-up complete.");
        return;
      }
      answers[active.completedKey] = "no";
      answers[active.dateKey] = nextDueDate;
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(completedOn)) {
        setError("Enter the date this follow-up was completed.");
        return;
      }
      answers[active.completedKey] = "yes";
      answers[active.dateKey] = completedOn;
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
        setError(result?.error ?? "Unable to update this follow-up.");
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
      <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
        <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium">Adoption follow-ups due</p>
          <ul className="space-y-1.5">
            {due.map((alert) => (
              <li
                key={`${alert.applicationId}-${alert.kind}-${alert.date}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {alert.catName} — {alert.label} ({vetCareDueTimingLabel(alert.date)})
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-sky-300 bg-background/80 text-sky-950 hover:bg-background"
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
              Update follow-up{active ? ` — ${active.catName}` : ""}
            </DialogTitle>
          </DialogHeader>
          {active ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {active.label} · due {vetCareDueTimingLabel(active.date)} ({active.date})
              </p>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={changeDueOnly}
                  onCheckedChange={(checked) => setChangeDueOnly(checked === true)}
                  disabled={saving}
                />
                <span>Only change the due date (do not mark complete)</span>
              </label>

              {changeDueOnly ? (
                <div className="space-y-1.5">
                  <Label htmlFor="follow-up-reschedule">New due date</Label>
                  <Input
                    id="follow-up-reschedule"
                    type="date"
                    value={nextDueDate}
                    disabled={saving}
                    onChange={(event) => setNextDueDate(event.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="follow-up-completed">Date completed</Label>
                  <Input
                    id="follow-up-completed"
                    type="date"
                    value={completedOn}
                    disabled={saving}
                    onChange={(event) => setCompletedOn(event.target.value)}
                  />
                </div>
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
