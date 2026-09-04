"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { VolunteerHours, Shift, Profile, HelpRequest } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getStatusLabel } from "@/lib/cases/statuses";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const HOUR_TYPES = [
  { value: "trapping", label: "Trapping" },
  { value: "transport", label: "Transport" },
  { value: "clinic", label: "Clinic" },
  { value: "recovery", label: "Recovery" },
  { value: "event", label: "Event" },
  { value: "admin", label: "Admin" },
  { value: "other", label: "Other" },
] as const;

type HourForm = {
  date: string;
  hours: number;
  hour_type: string;
  notes: string;
};

function defaultLogForm(): HourForm {
  return {
    date: new Date().toISOString().split("T")[0],
    hours: 1,
    hour_type: "trapping",
    notes: "",
  };
}

function hourFormFromEntry(entry: VolunteerHours): HourForm {
  return {
    date: entry.date,
    hours: Number(entry.hours),
    hour_type: entry.hour_type,
    notes: entry.notes ?? "",
  };
}

function formatHourType(type: string) {
  return type.replace(/_/g, " ");
}

interface MyImpactDashboardProps {
  hours: VolunteerHours[];
  shifts: Shift[];
  caseWorkHistory: HelpRequest[];
  profile: Profile | null;
}

function HourFormFields({
  form,
  onChange,
}: {
  form: HourForm;
  onChange: (form: HourForm) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Date</Label>
        <Input
          type="date"
          value={form.date}
          onChange={(event) => onChange({ ...form, date: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Hours</Label>
        <NumberInput
          step={0.5}
          min={0.5}
          emptyValue={0.5}
          value={form.hours}
          onValueChange={(value) => {
            if (typeof value === "number") onChange({ ...form, hours: value });
          }}
        />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={form.hour_type} onValueChange={(value) => onChange({ ...form, hour_type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOUR_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
          rows={2}
        />
      </div>
    </>
  );
}

export function MyImpactDashboard({ hours, shifts, caseWorkHistory, profile }: MyImpactDashboardProps) {
  const router = useRouter();
  const [logForm, setLogForm] = useState(defaultLogForm);
  const [editingEntry, setEditingEntry] = useState<VolunteerHours | null>(null);
  const [editForm, setEditForm] = useState<HourForm>(defaultLogForm());
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VolunteerHours | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalHours = hours.reduce((sum, h) => sum + Number(h.hours), 0);

  const byType = hours.reduce(
    (acc, h) => {
      acc[h.hour_type] = (acc[h.hour_type] ?? 0) + Number(h.hours);
      return acc;
    },
    {} as Record<string, number>
  );

  const chartData = Object.entries(byType).map(([type, hrs]) => ({ type, hours: hrs }));

  async function logHours() {
    if (!profile) return;
    const supabase = createClient();
    const { error } = await supabase.from("volunteer_hours").insert({
      volunteer_email: profile.email,
      volunteer_name: profile.full_name ?? profile.email,
      team_id: profile.team_id,
      ...logForm,
      notes: logForm.notes.trim() || null,
    });

    if (error) return;

    setLogForm(defaultLogForm());
    router.refresh();
  }

  function openEdit(entry: VolunteerHours) {
    setEditingEntry(entry);
    setEditForm(hourFormFromEntry(entry));
    setEditError(null);
  }

  async function saveEdit() {
    if (!editingEntry) return;
    setSavingEdit(true);
    setEditError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("volunteer_hours")
      .update({
        date: editForm.date,
        hours: editForm.hours,
        hour_type: editForm.hour_type,
        notes: editForm.notes.trim() || null,
      })
      .eq("id", editingEntry.id);

    setSavingEdit(false);

    if (error) {
      setEditError(error.message);
      return;
    }

    setEditingEntry(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const supabase = createClient();
    const { error } = await supabase.from("volunteer_hours").delete().eq("id", deleteTarget.id);

    setDeleting(false);

    if (!error) {
      setDeleteTarget(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Hours</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalHours.toFixed(1)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Shifts Attended</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{shifts.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Cases Worked</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{caseWorkHistory.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Hour Types</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{Object.keys(byType).length}</p></CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Hours by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="hsl(162 63% 35%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Log Hours</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HourFormFields form={logForm} onChange={setLogForm} />
          <Button onClick={logHours} className="md:col-span-2">
            Log Hours
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case work history</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Cases you claimed, annotated, reserved appointments for, or logged clinic results on.
          </p>
        </CardHeader>
        <CardContent>
          {caseWorkHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No case work yet. Activity on cases will appear here over time.
            </p>
          ) : (
            <div className="space-y-2">
              {caseWorkHistory.slice(0, 40).map((hr) => (
                <Link
                  key={hr.id}
                  href={`/case/${hr.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{hr.case_number}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {hr.contact_name || hr.colony_city || "Case"}
                      {hr.colony_zip ? ` · ${hr.colony_zip}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("shrink-0", STATUS_COLORS[hr.status] ?? "")}
                  >
                    {getStatusLabel(hr.status)}
                  </Badge>
                </Link>
              ))}
              {caseWorkHistory.length > 40 && (
                <p className="text-xs text-muted-foreground pt-1">
                  Showing your 40 most recent cases.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Hours</CardTitle></CardHeader>
        <CardContent>
          {hours.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hours logged yet.</p>
          ) : (
            <div className="space-y-3">
              {hours.slice(0, 20).map((entry) => (
                <div key={entry.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                        <span>{formatDate(entry.date)}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="capitalize">{formatHourType(entry.hour_type)}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-medium">{entry.hours} hrs</span>
                      </div>
                      {entry.notes?.trim() ? (
                        <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">
                          {entry.notes.trim()}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(entry)}
                        aria-label="Edit hours entry"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(entry)}
                        aria-label="Delete hours entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {hours.length > 20 && (
                <p className="text-xs text-muted-foreground pt-1">
                  Showing your 20 most recent entries.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editingEntry != null} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit hours entry</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HourFormFields form={editForm} onChange={setEditForm} />
            {editError && (
              <p className="md:col-span-2 text-sm text-destructive">{editError}</p>
            )}
            <Button onClick={saveEdit} className="md:col-span-2" disabled={savingEdit}>
              {savingEdit ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete hours entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will remove ${deleteTarget.hours} hours logged on ${formatDate(deleteTarget.date)}.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
