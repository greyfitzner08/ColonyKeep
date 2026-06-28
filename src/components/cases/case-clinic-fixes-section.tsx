"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import {
  clinicResultAgeLabel,
  clinicResultGenderLabel,
} from "@/lib/appointments/clinic-result";
import { formatDate } from "@/lib/utils";
import type { ClinicFix, HelpRequest } from "@/lib/types";

interface CaseClinicFixesSectionProps {
  helpRequest: HelpRequest;
  clinicFixes: ClinicFix[];
  canLog: boolean;
}

export function CaseClinicFixesSection({
  helpRequest,
  clinicFixes,
  canLog,
}: CaseClinicFixesSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ageCategory, setAgeCategory] = useState<"adult" | "kitten" | "">("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [clinicName, setClinicName] = useState("");
  const [fixDate, setFixDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setAgeCategory("");
    setGender("");
    setClinicName("");
    setFixDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setError(null);
  }

  async function submit() {
    if (!ageCategory || !gender) {
      setError("Select age category and gender.");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/help-requests/log-clinic-fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        helpRequestId: helpRequest.id,
        ageCategory,
        gender,
        clinicName: clinicName.trim() || undefined,
        fixDate,
        notes: notes.trim() || undefined,
      }),
    });

    const result = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to log clinic fix");
      return;
    }

    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <CaseCollapsibleSection title="Clinic fixes" defaultOpen={clinicFixes.length > 0}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Log cats fixed at a clinic, including walk-ins without a reserved appointment slot.
            Originally reported counts are preserved separately from fixes.
          </p>

          {canLog && (
            <Button size="sm" onClick={() => setOpen(true)}>
              Log clinic fix
            </Button>
          )}

          {clinicFixes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clinic fixes logged yet.</p>
          ) : (
            <div className="space-y-2">
              {clinicFixes.map((fix) => (
                <div key={fix.id} className="rounded-md border px-3 py-2 text-sm">
                  <p className="font-medium">
                    {clinicResultAgeLabel(fix.age_category)} ·{" "}
                    {clinicResultGenderLabel(fix.gender)} fixed
                    {fix.appointment_id ? " (appointment)" : " (walk-in)"}
                  </p>
                  <p className="text-muted-foreground">
                    {fix.clinic_name ? `${fix.clinic_name} · ` : ""}
                    {formatDate(fix.fix_date)}
                    {fix.logged_by_name ? ` · ${fix.logged_by_name}` : ""}
                  </p>
                  {fix.notes && <p className="mt-1 whitespace-pre-wrap">{fix.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CaseCollapsibleSection>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) resetForm();
          setOpen(nextOpen);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log clinic fix</DialogTitle>
            <DialogDescription>
              {helpRequest.case_number} — record a cat fixed outside a claimed appointment slot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Clinic name (optional)</Label>
              <Input
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. Feral Fixers"
              />
            </div>

            <div className="space-y-2">
              <Label>Fix date</Label>
              <Input type="date" value={fixDate} onChange={(e) => setFixDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Age category</Label>
              <Select
                value={ageCategory}
                onValueChange={(value) => setAgeCategory(value as "adult" | "kitten")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select age category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adult">Adult (8+ weeks)</SelectItem>
                  <SelectItem value="kitten">Kitten (under 8 weeks)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={gender}
                onValueChange={(value) => setGender(value as "male" | "female")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ear tip color, trap used, etc."
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={loading}>
              {loading ? "Saving…" : "Save fix"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
