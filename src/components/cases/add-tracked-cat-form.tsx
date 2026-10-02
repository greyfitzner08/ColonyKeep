"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FOSTER_FACILITIES, type FosterFacility } from "@/lib/cases/foster-facility";
import type { Cat } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

interface AddTrackedCatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  helpRequestId: string;
  onAdded: (cat: Cat) => void;
}

type CatGroup = {
  key: string;
  count: number;
  gender: "" | "male" | "female";
  clinicName: string;
  wentToFoster: "" | "yes" | "no";
  fosterFacility: FosterFacility | "";
  fosterFacilityOther: string;
  medicalNotes: string;
};

function newGroup(): CatGroup {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    count: 1,
    gender: "",
    clinicName: "",
    wentToFoster: "",
    fosterFacility: "",
    fosterFacilityOther: "",
    medicalNotes: "",
  };
}

export function AddTrackedCatDialog({
  open,
  onOpenChange,
  helpRequestId,
  onAdded,
}: AddTrackedCatDialogProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<CatGroup[]>([newGroup()]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setGroups([newGroup()]);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function updateGroup(key: string, patch: Partial<CatGroup>) {
    setGroups((current) => current.map((group) => (group.key === key ? { ...group, ...patch } : group)));
  }

  const total = groups.reduce((sum, group) => sum + (Number.isFinite(group.count) ? group.count : 0), 0);

  async function addCats() {
    for (const [index, group] of groups.entries()) {
      const label = `Group ${index + 1}`;
      if (!Number.isFinite(group.count) || group.count < 1) {
        setError(`${label}: enter how many cats.`);
        return;
      }
      if (group.gender !== "male" && group.gender !== "female") {
        setError(`${label}: select male or female.`);
        return;
      }
      if (group.clinicName.trim() && !group.wentToFoster) {
        setError(`${label}: select whether these cats are going to a facility.`);
        return;
      }
      if (group.wentToFoster === "yes" && !group.fosterFacility) {
        setError(`${label}: select where these cats are going.`);
        return;
      }
      if (group.wentToFoster === "yes" && group.fosterFacility === "other" && !group.fosterFacilityOther.trim()) {
        setError(`${label}: enter the facility name.`);
        return;
      }
    }

    setAdding(true);
    setError(null);

    const response = await fetch("/api/cats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        helpRequestId,
        groups: groups.map((group) => ({
          count: group.count,
          gender: group.gender,
          clinicName: group.clinicName.trim(),
          medical_notes: group.medicalNotes.trim(),
          wentToFoster: group.wentToFoster,
          fosterFacility: group.fosterFacility,
          fosterFacilityOther: group.fosterFacilityOther,
        })),
      }),
    });

    const result = await response.json().catch(() => null);
    setAdding(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to add cats");
      return;
    }

    const cats = (result?.cats ?? []) as Cat[];
    for (const cat of cats) onAdded(cat);
    const shouldRefresh = groups.some(
      (group) => group.clinicName.trim() || group.wentToFoster === "yes" || group.wentToFoster === "no"
    );
    resetForm();
    onOpenChange(false);
    if (shouldRefresh) router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add cats</DialogTitle>
          <DialogDescription>
            Enter cats that match as one group. A count of 8 males fixed at the same clinic is one row, not eight forms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {groups.map((group, index) => (
            <div key={group.key} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Group {index + 1}</p>
                {groups.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    aria-label={`Remove group ${index + 1}`}
                    onClick={() => setGroups((current) => current.filter((row) => row.key !== group.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label>How many</Label>
                  <NumberInput
                    integer
                    min={1}
                    max={30}
                    value={group.count}
                    onValueChange={(value) =>
                      updateGroup(group.key, { count: typeof value === "number" ? value : 1 })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Gender</Label>
                  <Select
                    value={group.gender || undefined}
                    onValueChange={(value) =>
                      updateGroup(group.key, { gender: value as "male" | "female" })
                    }
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
                <div className="space-y-1">
                  <Label>Where fixed</Label>
                  <Input
                    value={group.clinicName}
                    onChange={(event) => updateGroup(group.key, { clinicName: event.target.value })}
                    placeholder="Clinic name, or blank"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Going to a facility?</Label>
                  <Select
                    value={group.wentToFoster || "unset"}
                    onValueChange={(value) => {
                      const next = value === "unset" ? "" : (value as "yes" | "no");
                      updateGroup(group.key, {
                        wentToFoster: next,
                        fosterFacility: next === "yes" ? group.fosterFacility : "",
                        fosterFacilityOther: next === "yes" ? group.fosterFacilityOther : "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Select</SelectItem>
                      <SelectItem value="no">No — staying at the colony</SelectItem>
                      <SelectItem value="yes">Yes — foster or facility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {group.wentToFoster === "yes" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Facility</Label>
                    <Select
                      value={group.fosterFacility || "unset"}
                      onValueChange={(value) =>
                        updateGroup(group.key, {
                          fosterFacility: value === "unset" ? "" : (value as FosterFacility),
                          fosterFacilityOther: value === "other" ? group.fosterFacilityOther : "",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select facility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Select facility</SelectItem>
                        {FOSTER_FACILITIES.map((entry) => (
                          <SelectItem key={entry.value} value={entry.value}>
                            {entry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {group.fosterFacility === "other" ? (
                    <div className="space-y-1">
                      <Label>Facility name</Label>
                      <Input
                        value={group.fosterFacilityOther}
                        onChange={(event) =>
                          updateGroup(group.key, { fosterFacilityOther: event.target.value })
                        }
                        placeholder="Where are they going?"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground">Medical note (optional)</Label>
                <Input
                  className="h-8 text-sm"
                  value={group.medicalNotes}
                  onChange={(event) => updateGroup(group.key, { medicalNotes: event.target.value })}
                  placeholder="Only if something needs attention"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setGroups((current) => [...current, newGroup()])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add another group
          </Button>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={addCats} disabled={adding || total < 1}>
            <Plus className="mr-2 h-4 w-4" />
            {adding ? "Adding…" : `Add ${total} cat${total === 1 ? "" : "s"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
