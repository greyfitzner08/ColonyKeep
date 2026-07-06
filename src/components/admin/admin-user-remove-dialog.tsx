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
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/errors";
import type {
  AssignmentDecision,
  VolunteerAssignmentPreview,
} from "@/lib/admin/volunteer-assignments";
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
    return { action: "dismiss" };
  }
  return { action: "dismiss" };
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
  }, [open, user, onError]);

  function updateDecision(groupKey: string, decision: AssignmentDecision) {
    setDecisions((current) => ({ ...current, [groupKey]: decision }));
    setError(null);
    onError(null);
  }

  async function removeVolunteer() {
    if (!user) return;

    setRemoving(true);
    setError(null);
    onError(null);

    const response = await fetch("/api/admin/users/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        decisions,
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Remove {user.full_name ?? user.email}?</DialogTitle>
            <DialogDescription>
              {user.role === "admin"
                ? "This user is an administrator. Removing them deletes their login and profile permanently."
                : "This volunteer still has active assignments. Reassign each item to another user or dismiss it before removing their account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {preview?.groups.map((group) => {
              const decision =
                decisions[group.key] ??
                defaultDecisionForGroup(group.key, group.reassignable, group.requiresReassign);
              const action =
                group.reassignable && !group.requiresReassign
                  ? decision.action
                  : group.requiresReassign
                    ? "reassign"
                    : "dismiss";

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
                      <div className="flex flex-wrap gap-2">
                        {!group.requiresReassign ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={action === "dismiss" ? "default" : "outline"}
                            onClick={() => updateDecision(group.key, { action: "dismiss" })}
                          >
                            Dismiss and clear
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant={action === "reassign" ? "default" : "outline"}
                          onClick={() =>
                            updateDecision(group.key, {
                              action: "reassign",
                              targetUserId:
                                decision.action === "reassign" ? decision.targetUserId : "",
                            })
                          }
                        >
                          Reassign to another user
                        </Button>
                      </div>

                      <div className={cn(action !== "reassign" && "hidden")}>
                        <Label className="sr-only">Reassignment user</Label>
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
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      These records will be cleared automatically when this volunteer is removed.
                    </p>
                  )}
                </div>
              );
            })}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
              disabled={removing}
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
