"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [query, setQuery] = useState("");
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

  const visibleAssignees = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sortedAssignees;
    return sortedAssignees.filter((person) => {
      const name = caseAssigneeDisplayName(person).toLowerCase();
      return name.includes(needle) || person.email.toLowerCase().includes(needle);
    });
  }, [query, sortedAssignees]);

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
      setQuery("");
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
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="assign-case-user"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search TNVR users…"
                    disabled={saving}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-md border">
                  {visibleAssignees.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      No TNVR users match “{query.trim()}”.
                    </p>
                  ) : (
                    visibleAssignees.map((person) => {
                      const selected = person.id === assigneeId;
                      return (
                        <button
                          key={person.id}
                          type="button"
                          disabled={saving}
                          onClick={() => setAssigneeId(person.id)}
                          className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent ${
                            selected ? "bg-accent" : ""
                          }`}
                        >
                          {caseAssigneeDisplayName(person)}
                          {preferredTeamId && person.team_id === preferredTeamId
                            ? " · case team"
                            : ""}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
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
