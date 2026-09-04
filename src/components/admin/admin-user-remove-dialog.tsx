"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api/errors";
import type {
  AssignmentDecision,
  VolunteerAssignmentPreview,
} from "@/lib/admin/volunteer-assignments";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface AdminUserRemoveDialogProps {
  user: Profile | null;
  users: Profile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (message: string | null) => void;
}

function defaultDecisionForGroup(
  groupKey: string,
  reassignable: boolean,
  requiresReassign: boolean
): AssignmentDecision {
  if (requiresReassign) {
    return { action: "reassign", targetUserId: "" };
  }
  if (!reassignable || groupKey === "volunteer_records" || groupKey === "trap_team_membership") {
    return { action: "unassign" };
  }
  return { action: "unassign" };
}

export function AdminUserRemoveDialog({
  user,
  users,
  open,
  onOpenChange,
  onError,
}: AdminUserRemoveDialogProps) {
  const router = useRouter();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState<VolunteerAssignmentPreview | null>(null);
  const [decisions, setDecisions] = useState<Record<string, AssignmentDecision>>({});
  const [error, setError] = useState<string | null>(null);
  const [simpleConfirmOpen, setSimpleConfirmOpen] = useState(false);

  const reassignmentOptions = useMemo(
    () =>
      users.filter(
        (entry) => entry.id !== user?.id && entry.role !== "admin" && entry.email.trim().length > 0
      ),
    [users, user?.id]
  );

  useEffect(() => {
    if (!open || !user) {
      setPreview(null);
      setDecisions({});
      setError(null);
      setSimpleConfirmOpen(false);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);
    setError(null);
    onError(null);

    fetch("/api/admin/users/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok) {
          const message = getApiErrorMessage(result, "Unable to load volunteer assignments");
          setError(message);
          onError(message);
          onOpenChange(false);
          return;
        }

        const nextPreview = result.preview as VolunteerAssignmentPreview;
        setPreview(nextPreview);
        const initialDecisions = Object.fromEntries(
          nextPreview.groups.map((group) => [
            group.key,
            defaultDecisionForGroup(group.key, group.reassignable, group.requiresReassign),
          ])
        );
        setDecisions(initialDecisions);

        if (!nextPreview.hasAssignments) {
          setSimpleConfirmOpen(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const incompleteReassign = useMemo(() => {
    if (!preview) return null;
    for (const group of preview.groups) {
      const decision =
        decisions[group.key] ??
        defaultDecisionForGroup(group.key, group.reassignable, group.requiresReassign);
      if (group.requiresReassign && decision.action !== "reassign") {
        return `Choose who should take over ${group.label.toLowerCase()}.`;
      }
      if (decision.action === "reassign" && !decision.targetUserId) {
        return `Select a user to reassign ${group.label.toLowerCase()} to.`;
      }
    }
    return null;
  }, [preview, decisions]);

  function updateDecision(groupKey: string, decision: AssignmentDecision) {
    setDecisions((current) => ({ ...current, [groupKey]: decision }));
    setError(null);
    onError(null);
  }

  async function removeVolunteer() {
    if (!user || !preview) return;

    if (incompleteReassign) {
      setError(incompleteReassign);
      onError(incompleteReassign);
      return;
    }

    const resolvedDecisions = Object.fromEntries(
      preview.groups.map((group) => [
        group.key,
        decisions[group.key] ??
          defaultDecisionForGroup(group.key, group.reassignable, group.requiresReassign),
      ])
    );

    setRemoving(true);
    setError(null);
    onError(null);

    const response = await fetch("/api/admin/users/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        decisions: resolvedDecisions,
      }),
    });
    const result = await response.json().catch(() => null);
    setRemoving(false);

    if (!response.ok) {
      const message = getApiErrorMessage(result, "Unable to remove volunteer");
      setError(message);
      onError(message);
      return;
    }

    setSimpleConfirmOpen(false);
    onOpenChange(false);
    router.refresh();
  }

  if (!user) return null;

  return (
    <>
      <Dialog
        open={open && !simpleConfirmOpen && !loadingPreview && preview?.hasAssignments}
        onOpenChange={(nextOpen) => !removing && onOpenChange(nextOpen)}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Remove {user.full_name ?? user.email}?</DialogTitle>
            <DialogDescription>
              Choose what happens to each assignment, then confirm removal. Releasing claims keeps
              case status and history — inquiry work stays in inquiry, trap work stays with its
              team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {preview?.groups.map((group) => {
              const decision =
                decisions[group.key] ??
                defaultDecisionForGroup(group.key, group.reassignable, group.requiresReassign);
              const selectedAction = group.requiresReassign ? "reassign" : decision.action;

              return (
                <div key={group.key} className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="font-medium">{group.label}</p>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {group.count} item{group.count === 1 ? "" : "s"}
                    </p>
                  </div>

                  <ul className="text-sm text-muted-foreground space-y-1">
                    {group.items.slice(0, 4).map((item) => (
                      <li key={item.id} className="truncate">
                        {item.label}
                      </li>
                    ))}
                    {group.items.length > 4 ? (
                      <li>+{group.items.length - 4} more</li>
                    ) : null}
                  </ul>

                  {group.reassignable ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">What should happen?</p>
                      <div className="grid gap-2">
                        {!group.requiresReassign ? (
                          <button
                            type="button"
                            disabled={removing}
                            aria-pressed={selectedAction === "unassign"}
                            onClick={() => updateDecision(group.key, { action: "unassign" })}
                            className={cn(
                              "rounded-md border px-3 py-2 text-left transition-colors",
                              selectedAction === "unassign"
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/60"
                            )}
                          >
                            <p className="text-sm font-medium">Release claims</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {group.unassignOutcome}
                            </p>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={removing || reassignmentOptions.length === 0}
                          aria-pressed={selectedAction === "reassign"}
                          onClick={() =>
                            updateDecision(group.key, {
                              action: "reassign",
                              targetUserId:
                                decision.action === "reassign" ? decision.targetUserId : "",
                            })
                          }
                          className={cn(
                            "rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-50",
                            selectedAction === "reassign"
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/60"
                          )}
                        >
                          <p className="text-sm font-medium">Transfer to another user</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Keep these items assigned by moving them to someone else first.
                          </p>
                        </button>
                      </div>

                      {selectedAction === "reassign" ? (
                        <div className="space-y-2">
                          <Label className="sr-only">Reassignment user</Label>
                          {reassignmentOptions.length === 0 ? (
                            <p className="text-sm text-destructive">
                              No other volunteers available to reassign to.
                            </p>
                          ) : (
                            <Select
                              value={
                                decision.action === "reassign" && decision.targetUserId
                                  ? decision.targetUserId
                                  : undefined
                              }
                              onValueChange={(targetUserId) =>
                                updateDecision(group.key, { action: "reassign", targetUserId })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                              <SelectContent>
                                {reassignmentOptions.map((entry) => (
                                  <SelectItem key={entry.id} value={entry.id}>
                                    {entry.full_name?.trim() || entry.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{group.unassignOutcome}</p>
                  )}
                </div>
              );
            })}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {!error && incompleteReassign ? (
              <p className="text-sm text-muted-foreground">{incompleteReassign}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void removeVolunteer()}
              disabled={removing || Boolean(incompleteReassign)}
            >
              {removing ? "Removing…" : "Remove volunteer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open && loadingPreview} onOpenChange={() => undefined}>
        <DialogContent className="max-w-sm">
          <div className="flex items-center gap-3 py-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Checking volunteer assignments…</p>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={simpleConfirmOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !removing) {
            setSimpleConfirmOpen(false);
            onOpenChange(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove volunteer?</AlertDialogTitle>
            <AlertDialogDescription>
              {preview?.hasAssignments
                ? "Review assignments before removing this user."
                : user.role === "admin"
                  ? `Remove administrator ${user.full_name ?? user.email}? Their login and profile will be deleted permanently.`
                  : `Remove ${user.full_name ?? user.email} from the platform? Their login and profile will be deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removing || preview?.hasAssignments}
              onClick={(event) => {
                event.preventDefault();
                void removeVolunteer();
              }}
            >
              {removing ? "Removing…" : "Remove volunteer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
