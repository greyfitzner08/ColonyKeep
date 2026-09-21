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

function displayValue(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed || "—";
}

function buildProfileCompareRows(
  keep: DuplicateProfileSummary,
  merge: DuplicateProfileSummary
): Array<{ label: string; keep: string; merge: string; differs: boolean }> {
  const rows = [
    { label: "Name", keep: displayValue(keep.full_name), merge: displayValue(merge.full_name) },
    { label: "Email / login", keep: displayValue(keep.email), merge: displayValue(merge.email) },
    { label: "Phone", keep: displayValue(keep.phone), merge: displayValue(merge.phone) },
    {
      label: "Birthday",
      keep: keep.birthday ? formatDate(keep.birthday) : "—",
      merge: merge.birthday ? formatDate(merge.birthday) : "—",
    },
    { label: "Platform role", keep: roleLabel(keep.role), merge: roleLabel(merge.role) },
    {
      label: "Volunteer roles",
      keep: keep.volunteer_roles.length > 0 ? keep.volunteer_roles.join(", ") : "—",
      merge: merge.volunteer_roles.length > 0 ? merge.volunteer_roles.join(", ") : "—",
    },
    {
      label: "Joined",
      keep: formatDate(keep.created_at),
      merge: formatDate(merge.created_at),
    },
  ];
  return rows.map((row) => ({ ...row, differs: row.keep !== row.merge }));
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
  const [dismissing, setDismissing] = useState(false);
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

  async function dismissGroup() {
    if (!selectedGroup || selectedGroup.profiles.length < 2) return;

    setDismissing(true);
    setError(null);
    onError(null);

    const response = await fetch("/api/admin/duplicates/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "profile",
        ids: selectedGroup.profiles.map((profile) => profile.id),
      }),
    });
    const result = await response.json().catch(() => null);
    setDismissing(false);

    if (!response.ok) {
      const message = getApiErrorMessage(result, "Unable to dismiss this duplicate group");
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
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Compare accounts side by side, choose which one to keep, then merge the other into
                it.
              </p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Amber rows are fields that differ between the two accounts.</li>
                <li>
                  Click <span className="font-medium text-foreground">Keep</span> on the account
                  whose email should remain the login.
                </li>
                <li>
                  Merge fills blank fields on the kept account from the other, combines volunteer
                  roles, saves the other email as an alias, and moves cases/shifts/hours over.
                </li>
                <li>
                  If these are different people (or you want to keep both accounts), use{" "}
                  <span className="font-medium text-foreground">Not a duplicate</span> to hide the
                  group from this list.
                </li>
              </ol>
            </div>
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
                  <div className="rounded-md border bg-muted/20 p-3 text-sm space-y-3">
                    <div className="overflow-x-auto rounded-md border bg-background">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead className="bg-muted/40 text-left">
                          <tr>
                            <th className="px-3 py-2 font-medium">Field</th>
                            <th className="px-3 py-2 font-medium bg-emerald-50/80">
                              Keep · {keepProfile.full_name || keepProfile.email}
                            </th>
                            <th className="px-3 py-2 font-medium bg-amber-50/80">
                              Merge away · {mergeProfile.full_name || mergeProfile.email}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {buildProfileCompareRows(keepProfile, mergeProfile).map((row) => (
                            <tr
                              key={row.label}
                              className={cn("border-t", row.differs && "bg-amber-50/70")}
                            >
                              <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
                              <td className={cn("px-3 py-2", row.differs && "font-medium")}>
                                {row.keep}
                              </td>
                              <td className="px-3 py-2">{row.merge}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                        When a field differs, the kept value wins; blank kept fields are filled from
                        the merged account. Volunteer roles are combined.
                      </li>
                      <li>
                        Claimed cases, appointments, shifts, hours, and related records from the
                        merged account move to the kept account (nothing is dropped).
                      </li>
                    </ul>
                    <Button
                      type="button"
                      className="mt-2"
                      disabled={merging || dismissing || keepProfileId === mergeProfileId}
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

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2">
                  <p className="text-sm text-muted-foreground">
                    Different people, or you want to keep both accounts as-is?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={dismissing || merging || !selectedGroup}
                    onClick={() => void dismissGroup()}
                  >
                    {dismissing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Not a duplicate / keep both"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
