"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GitMerge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn, formatDate } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  duplicateReasonLabels,
  type DuplicateMatchReason,
} from "@/lib/admin/find-duplicate-profiles";
import { ROLE_PERMISSIONS, isKnownUserRole } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

interface DuplicateProfileSummary {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  birthday: string | null;
  role: UserRole | null;
  volunteer_roles: string[];
  team_id: string | null;
  created_at: string;
}

interface DuplicateGroupPayload {
  id: string;
  reasons: DuplicateMatchReason[];
  profiles: DuplicateProfileSummary[];
}

interface AdminDuplicateAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onError: (message: string | null) => void;
}

function roleLabel(role: UserRole | null): string {
  if (!role || !isKnownUserRole(role)) return "No role";
  return ROLE_PERMISSIONS[role].label;
}

export function AdminDuplicateAccountsDialog({
  open,
  onOpenChange,
  currentUserId,
  onError,
}: AdminDuplicateAccountsDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroupPayload[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [keepProfileId, setKeepProfileId] = useState<string | null>(null);
  const [mergeProfileId, setMergeProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    setError(null);
    onError(null);

    const response = await fetch("/api/admin/users/duplicates");
    const result = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      const message = getApiErrorMessage(result, "Unable to scan for duplicate accounts");
      setError(message);
      onError(message);
      return;
    }

    const nextGroups = (result?.groups ?? []) as DuplicateGroupPayload[];
    setGroups(nextGroups);
    setSelectedGroupId(nextGroups[0]?.id ?? null);
    setKeepProfileId(null);
    setMergeProfileId(null);
  }, [onError]);

  useEffect(() => {
    if (open) {
      void loadDuplicates();
    }
  }, [open, loadDuplicates]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  useEffect(() => {
    if (!selectedGroup) {
      setKeepProfileId(null);
      setMergeProfileId(null);
      return;
    }
    const preferred =
      selectedGroup.profiles.find((profile) => profile.id !== currentUserId) ??
      selectedGroup.profiles[0] ??
      null;
    setKeepProfileId(preferred?.id ?? null);
    const other =
      selectedGroup.profiles.find((profile) => profile.id !== preferred?.id) ?? null;
    setMergeProfileId(other?.id ?? null);
  }, [selectedGroup, currentUserId]);

  const keepProfile = selectedGroup?.profiles.find((p) => p.id === keepProfileId) ?? null;
  const mergeProfile = selectedGroup?.profiles.find((p) => p.id === mergeProfileId) ?? null;

  async function runMerge() {
    if (!keepProfileId || !mergeProfileId) return;

    setMerging(true);
    setError(null);
    onError(null);

    const response = await fetch("/api/admin/users/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepProfileId, mergeProfileId }),
    });
    const result = await response.json().catch(() => null);
    setMerging(false);

    if (!response.ok) {
      const message = getApiErrorMessage(result, "Unable to merge accounts");
      setError(message);
      onError(message);
      return;
    }

    router.refresh();
    await loadDuplicates();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Merge duplicate accounts
          </DialogTitle>
          <DialogDescription>
            Review likely duplicates, choose which account to keep, and merge the other into it.
            Both emails are preserved (the merged email becomes an alias). Cases, appointments,
            shifts, and hours from both accounts stay attached to the kept account.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning accounts…
          </div>
        ) : groups.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No likely duplicate accounts found by phone, name + birthday, or matching name without
            contact details.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Duplicate groups ({groups.length})</Label>
              <div className="flex flex-col gap-2">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left transition-colors",
                      selectedGroupId === group.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <p className="text-sm font-medium">
                      {group.profiles.map((p) => p.full_name || p.email).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {duplicateReasonLabels(group.reasons)} · {group.profiles.length} accounts
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {selectedGroup && (
              <div className="space-y-3">
                <Label>Choose which account to keep</Label>
                <div className="grid gap-2">
                  {selectedGroup.profiles.map((profile) => {
                    const isKeep = keepProfileId === profile.id;
                    const isMerge = mergeProfileId === profile.id;
                    const isSelf = profile.id === currentUserId;
                    return (
                      <div
                        key={profile.id}
                        className={cn(
                          "rounded-md border p-3",
                          isKeep && "border-emerald-300 bg-emerald-50/50",
                          isMerge && "border-amber-300 bg-amber-50/40"
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="font-medium">{profile.full_name || "Unnamed"}</p>
                            <p className="break-all text-sm text-muted-foreground">{profile.email}</p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <Badge variant="outline">{roleLabel(profile.role)}</Badge>
                              {profile.phone && (
                                <Badge variant="secondary">{profile.phone}</Badge>
                              )}
                              {profile.birthday && (
                                <Badge variant="secondary">
                                  Birthday {formatDate(profile.birthday)}
                                </Badge>
                              )}
                              <Badge variant="outline">
                                Joined {formatDate(profile.created_at)}
                              </Badge>
                              {isSelf && <Badge>You</Badge>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={isKeep ? "default" : "outline"}
                              onClick={() => {
                                setKeepProfileId(profile.id);
                                if (mergeProfileId === profile.id) {
                                  const other = selectedGroup.profiles.find(
                                    (entry) => entry.id !== profile.id
                                  );
                                  setMergeProfileId(other?.id ?? null);
                                }
                              }}
                            >
                              Keep
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={isMerge ? "default" : "outline"}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "You cannot merge away the account you are signed in with"
                                  : undefined
                              }
                              onClick={() => {
                                setMergeProfileId(profile.id);
                                if (keepProfileId === profile.id) {
                                  const other = selectedGroup.profiles.find(
                                    (entry) => entry.id !== profile.id
                                  );
                                  setKeepProfileId(other?.id ?? null);
                                }
                              }}
                            >
                              Merge away
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {keepProfile && mergeProfile && (
                  <div className="rounded-md border bg-muted/20 p-3 text-sm space-y-2">
                    <p>
                      <span className="font-medium">Keep:</span>{" "}
                      {keepProfile.full_name || keepProfile.email} ({keepProfile.email})
                    </p>
                    <p>
                      <span className="font-medium">Merge into it:</span>{" "}
                      {mergeProfile.full_name || mergeProfile.email} ({mergeProfile.email})
                    </p>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                      <li>
                        Login stays on the kept email. The merged email is saved as an alternate
                        email on the kept account.
                      </li>
                      <li>
                        Claimed cases, appointments, shifts, hours, and related records from the
                        merged account move to the kept account (nothing is dropped).
                      </li>
                      <li>
                        Profile details fill in missing fields and combine volunteer roles. The
                        merged login is removed.
                      </li>
                    </ul>
                    <Button
                      type="button"
                      className="mt-2"
                      disabled={merging || keepProfileId === mergeProfileId}
                      onClick={() => void runMerge()}
                    >
                      {merging ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Merging…
                        </>
                      ) : (
                        "Merge accounts"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
