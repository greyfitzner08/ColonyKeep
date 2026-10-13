"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  caseAssigneeDisplayName,
  type CaseAssigneeOption,
} from "@/lib/cases/case-assignees";
import { postCaseAssign } from "@/lib/cases/case-claim-api";

interface AssignCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  helpRequestId: string;
  caseNumber?: string | null;
  currentClaimedByEmail?: string | null;
  assignees: CaseAssigneeOption[];
  preferredTeamId?: string | null;
}

export function AssignCaseDialog({
  open,
  onOpenChange,
  helpRequestId,
  caseNumber,
  currentClaimedByEmail,
  assignees,
  preferredTeamId = null,
}: AssignCaseDialogProps) {
  const router = useRouter();
  const [assigneeId, setAssigneeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedAssignees = useMemo(() => {
    const next = [...assignees];
    next.sort((a, b) => {
      if (preferredTeamId) {
        const aMatch = a.team_id === preferredTeamId ? 0 : 1;
        const bMatch = b.team_id === preferredTeamId ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      return caseAssigneeDisplayName(a).localeCompare(caseAssigneeDisplayName(b), undefined, {
        sensitivity: "base",
      });
    });
    return next;
  }, [assignees, preferredTeamId]);

  const defaultId = useMemo(() => {
    if (!currentClaimedByEmail) return "";
    const match = assignees.find(
      (person) => person.email.toLowerCase() === currentClaimedByEmail.trim().toLowerCase()
    );
    return match?.id ?? "";
  }, [assignees, currentClaimedByEmail]);

  useEffect(() => {
    if (open) {
      setAssigneeId(defaultId);
      setError(null);
    }
  }, [open, defaultId]);

  function handleOpenChange(next: boolean) {
    if (saving) return;
    onOpenChange(next);
  }

  async function save() {
    if (!assigneeId) {
      setError("Select a TNVR user.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await postCaseAssign(helpRequestId, assigneeId);
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to assign this case.");
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign case{caseNumber ? ` · ${caseNumber}` : ""}</DialogTitle>
          <DialogDescription>
            Give this case to a TNVR team member. They&apos;ll see it under My Cases.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assign-case-user">TNVR user</Label>
            {sortedAssignees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No TNVR users found. Add someone with the TNVR Team role first.
              </p>
            ) : (
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={saving}>
                <SelectTrigger id="assign-case-user">
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {sortedAssignees.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {caseAssigneeDisplayName(person)}
                      {preferredTeamId && person.team_id === preferredTeamId
                        ? " · case team"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || sortedAssignees.length === 0 || !assigneeId}
              onClick={() => void save()}
            >
              {saving ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
