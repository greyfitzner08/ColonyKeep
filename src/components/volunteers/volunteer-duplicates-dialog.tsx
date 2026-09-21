"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, GitMerge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn, formatDate } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/errors";
import { ROLE_PERMISSIONS, isKnownUserRole } from "@/lib/constants";
import { volunteerRoleLabel } from "@/lib/volunteers/role-catalog";
import {
  applicationDuplicateReasonLabels,
  type DuplicateApplicationGroup,
} from "@/lib/volunteers/find-duplicate-applications";
import type { Profile, RoleDescription, VolunteerApplication, VolunteerRole } from "@/lib/types";

interface VolunteerDuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: DuplicateApplicationGroup[];
  profilesByEmail: Record<string, Profile>;
  roleCatalog: RoleDescription[];
  currentUserId: string;
  onError: (message: string | null) => void;
  /** Called after a group is dismissed so the parent can drop it from local state. */
  onDismissed?: (applicationIds: string[]) => void;
}

type CompareRow = {
  label: string;
  left: string;
  right: string;
  differs: boolean;
};

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

function displayValue(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed || "—";
}

function boolLabel(value: boolean | null | undefined): string {
  return value ? "Yes" : "No";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function profileForApplication(
  application: VolunteerApplication,
  profilesByEmail: Record<string, Profile>
): Profile | undefined {
  return profilesByEmail[normalizeEmail(application.email)];
}

function buildCompareRows(
  left: VolunteerApplication,
  right: VolunteerApplication,
  leftProfile: Profile | undefined,
  rightProfile: Profile | undefined,
  roleCatalog: RoleDescription[]
): CompareRow[] {
  const roleText = (roles: string[] | null | undefined) =>
    (roles ?? []).length > 0
      ? (roles ?? [])
          .map((role) => volunteerRoleLabel(role as VolunteerRole, roleCatalog))
          .join(", ")
      : "—";

  const address = (app: VolunteerApplication) => {
    const parts = [
      app.home_street,
      [app.home_city, app.home_state].filter(Boolean).join(", "),
      app.home_zip,
      app.home_county ? `${app.home_county} County` : null,
    ]
      .map((part) => (part ?? "").trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "—";
  };

  const platformRole = (profile: Profile | undefined) => {
    if (!profile?.role) return "No login account";
    if (!isKnownUserRole(profile.role)) return profile.role;
    return ROLE_PERMISSIONS[profile.role].label;
  };

  const rows: Array<{ label: string; left: string; right: string }> = [
    { label: "Name", left: displayValue(left.full_name), right: displayValue(right.full_name) },
    { label: "Email / login", left: displayValue(left.email), right: displayValue(right.email) },
    { label: "Phone", left: displayValue(left.phone), right: displayValue(right.phone) },
    {
      label: "Birthday",
      left: left.birthday ? formatDate(left.birthday) : "—",
      right: right.birthday ? formatDate(right.birthday) : "—",
    },
    { label: "Address", left: address(left), right: address(right) },
    {
      label: "Application status",
      left: statusLabel(left.status),
      right: statusLabel(right.status),
    },
    {
      label: "Volunteer interests",
      left: roleText(left.roles_requested),
      right: roleText(right.roles_requested),
    },
    {
      label: "Login account",
      left: platformRole(leftProfile),
      right: platformRole(rightProfile),
    },
    {
      label: "Approved roles on login",
      left: leftProfile ? roleText(leftProfile.volunteer_roles) : "—",
      right: rightProfile ? roleText(rightProfile.volunteer_roles) : "—",
    },
    {
      label: "Liability waiver",
      left: boolLabel(left.liability_waiver_signed),
      right: boolLabel(right.liability_waiver_signed),
    },
    {
      label: "Shadow completed",
      left: boolLabel(left.shadow_completed),
      right: boolLabel(right.shadow_completed),
    },
    {
      label: "Policy signed",
      left: boolLabel(left.policy_signed),
      right: boolLabel(right.policy_signed),
    },
    {
      label: "Intake training",
      left: boolLabel(left.intake_training),
      right: boolLabel(right.intake_training),
    },
    {
      label: "TNVR certificate",
      left: boolLabel(left.tnvr_certificate_uploaded),
      right: boolLabel(right.tnvr_certificate_uploaded),
    },
    {
      label: "Event crash course",
      left: boolLabel(left.event_crash_course),
      right: boolLabel(right.event_crash_course),
    },
    {
      label: "Adoption training",
      left: boolLabel(left.adoption_training),
      right: boolLabel(right.adoption_training),
    },
    {
      label: "Applied",
      left: formatDate(left.created_at),
      right: formatDate(right.created_at),
    },
  ];

  return rows.map((row) => ({
    ...row,
    differs: row.left !== row.right,
  }));
}

export function VolunteerDuplicatesDialog({
  open,
  onOpenChange,
  groups,
  profilesByEmail,
  roleCatalog,
  currentUserId,
  onError,
  onDismissed,
}: VolunteerDuplicatesDialogProps) {
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [keepApplicationId, setKeepApplicationId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    onError(null);
    setSelectedGroupId(groups[0]?.id ?? null);
  }, [open, groups, onError]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const pair = useMemo(() => {
    if (!selectedGroup || selectedGroup.applications.length < 2) return null;
    const sorted = [...selectedGroup.applications].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return { left: sorted[0]!, right: sorted[1]!, extras: sorted.slice(2) };
  }, [selectedGroup]);

  useEffect(() => {
    if (!pair) {
      setKeepApplicationId(null);
      return;
    }
    // Prefer the approved / older record when choosing a default keep target.
    const preferred =
      [pair.left, pair.right].find((app) => app.status === "approved") ??
      pair.left;
    setKeepApplicationId(preferred.id);
  }, [pair]);

  const keepApplication =
    pair == null
      ? null
      : pair.left.id === keepApplicationId
        ? pair.left
        : pair.right.id === keepApplicationId
          ? pair.right
          : null;
  const discardApplication =
    pair == null || !keepApplication
      ? null
      : keepApplication.id === pair.left.id
        ? pair.right
        : pair.left;

  const keepProfile = keepApplication
    ? profileForApplication(keepApplication, profilesByEmail)
    : undefined;
  const discardProfile = discardApplication
    ? profileForApplication(discardApplication, profilesByEmail)
    : undefined;

  const canMergeAccounts = Boolean(
    keepProfile &&
      discardProfile &&
      keepProfile.id !== discardProfile.id
  );
  const mergeBlockedBecauseSelf = Boolean(
    canMergeAccounts && discardProfile?.id === currentUserId
  );

  const compareRows = useMemo(() => {
    if (!pair) return [];
    return buildCompareRows(
      pair.left,
      pair.right,
      profileForApplication(pair.left, profilesByEmail),
      profileForApplication(pair.right, profilesByEmail),
      roleCatalog
    );
  }, [pair, profilesByEmail, roleCatalog]);

  const differingCount = compareRows.filter((row) => row.differs).length;

  async function runResolve() {
    if (!keepApplication || !discardApplication) return;

    setWorking(true);
    setError(null);
    onError(null);

    if (canMergeAccounts && keepProfile && discardProfile) {
      if (discardProfile.id === currentUserId) {
        const message =
          "You are signed in as the account marked to remove. Choose the other record to keep, or sign in with a different admin account.";
        setError(message);
        onError(message);
        setWorking(false);
        return;
      }

      const response = await fetch("/api/admin/users/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keepProfileId: keepProfile.id,
          mergeProfileId: discardProfile.id,
        }),
      });
      const result = await response.json().catch(() => null);
      setWorking(false);

      if (!response.ok) {
        const message = getApiErrorMessage(result, "Unable to merge duplicate accounts");
        setError(message);
        onError(message);
        return;
      }

      router.refresh();
      onOpenChange(false);
      return;
    }

    const response = await fetch("/api/volunteers/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: discardApplication.id }),
    });
    const result = await response.json().catch(() => null);
    setWorking(false);

    if (!response.ok) {
      const message = getApiErrorMessage(result, "Unable to remove the duplicate application");
      setError(message);
      onError(message);
      return;
    }

    router.refresh();
    onOpenChange(false);
  }

  async function dismissGroup() {
    if (!selectedGroup || selectedGroup.applications.length < 2) return;

    setDismissing(true);
    setError(null);
    onError(null);

    const applicationIds = selectedGroup.applications.map((app) => app.id);
    const response = await fetch("/api/admin/duplicates/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "application",
        ids: applicationIds,
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

    onDismissed?.(applicationIds);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Review duplicate volunteers
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Compare matching records, choose which one to keep, then merge or remove the other.</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Differences are highlighted in amber so you can see what would change.</li>
                <li>
                  Click <span className="font-medium text-foreground">Keep this one</span> on the
                  stronger / more complete record.
                </li>
                <li>
                  Confirm below. If both have login accounts, we merge them into the kept email and
                  fill blank fields from the other. If not, we only remove the duplicate application.
                </li>
                <li>
                  If these are different people (or you want to keep both), use{" "}
                  <span className="font-medium text-foreground">Not a duplicate</span> to hide the
                  group.
                </li>
              </ol>
            </div>
          </DialogDescription>
        </DialogHeader>

        {groups.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No possible duplicate applications right now.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Duplicate groups ({groups.length})</Label>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
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
                      {group.applications.map((app) => app.full_name).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {applicationDuplicateReasonLabels(group.reasons)} ·{" "}
                      {group.applications.length} records
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {pair && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Side-by-side comparison</Label>
                  <p className="text-xs text-muted-foreground">
                    {differingCount === 0
                      ? "All compared fields match"
                      : `${differingCount} field${differingCount === 1 ? "" : "s"} differ`}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[pair.left, pair.right].map((application) => {
                    const isKeep = keepApplicationId === application.id;
                    const profile = profileForApplication(application, profilesByEmail);
                    return (
                      <button
                        key={application.id}
                        type="button"
                        onClick={() => setKeepApplicationId(application.id)}
                        className={cn(
                          "rounded-md border p-3 text-left transition-colors",
                          isKeep
                            ? "border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-300"
                            : "hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{application.full_name}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {application.email}
                            </p>
                          </div>
                          <Badge
                            variant={isKeep ? "default" : "outline"}
                            className={cn(isKeep && "bg-emerald-700")}
                          >
                            {isKeep ? "Keeping" : "Keep this one"}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="capitalize">
                            {statusLabel(application.status)}
                          </Badge>
                          <Badge variant="outline">
                            {profile ? "Has login" : "No login yet"}
                          </Badge>
                          <Badge variant="outline">
                            Applied {formatDate(application.created_at)}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {pair.extras.length > 0 && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    <p className="font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      This group has {pair.extras.length + 2} matching records
                    </p>
                    <p className="mt-1 text-amber-900">
                      Resolve the pair below first, then reopen to review{" "}
                      {pair.extras.map((app) => app.full_name).join(", ")}.
                    </p>
                  </div>
                )}

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium w-[28%]">Field</th>
                        <th
                          className={cn(
                            "px-3 py-2 font-medium",
                            keepApplicationId === pair.left.id && "bg-emerald-50/80"
                          )}
                        >
                          {pair.left.full_name}
                          {keepApplicationId === pair.left.id ? " (keep)" : ""}
                        </th>
                        <th
                          className={cn(
                            "px-3 py-2 font-medium",
                            keepApplicationId === pair.right.id && "bg-emerald-50/80"
                          )}
                        >
                          {pair.right.full_name}
                          {keepApplicationId === pair.right.id ? " (keep)" : ""}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareRows.map((row) => (
                        <tr
                          key={row.label}
                          className={cn(
                            "border-t",
                            row.differs && "bg-amber-50/70"
                          )}
                        >
                          <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
                          <td
                            className={cn(
                              "px-3 py-2 align-top",
                              keepApplicationId === pair.left.id && "bg-emerald-50/40",
                              row.differs && keepApplicationId === pair.left.id && "font-medium"
                            )}
                          >
                            {row.left}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2 align-top",
                              keepApplicationId === pair.right.id && "bg-emerald-50/40",
                              row.differs && keepApplicationId === pair.right.id && "font-medium"
                            )}
                          >
                            {row.right}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {keepApplication && discardApplication && (
                  <div className="rounded-md border bg-muted/20 p-3 text-sm space-y-2">
                    <p>
                      <span className="font-medium">Keeping:</span> {keepApplication.full_name} (
                      {keepApplication.email})
                    </p>
                    <p>
                      <span className="font-medium">Removing:</span> {discardApplication.full_name}{" "}
                      ({discardApplication.email})
                    </p>
                    {canMergeAccounts ? (
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        <li>
                          Login stays on <span className="font-medium text-foreground">{keepApplication.email}</span>.
                          The other email is saved as an alternate email.
                        </li>
                        <li>
                          When a field differs, the kept record wins; blank fields on the kept
                          record are filled from the other. Training flags and volunteer roles are
                          combined.
                        </li>
                        <li>
                          Cases, appointments, shifts, and hours from both accounts move to the kept
                          login. The duplicate login and application are removed.
                        </li>
                      </ul>
                    ) : (
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        <li>
                          Only one login account is involved (or neither has one yet), so this
                          removes the duplicate application
                          {discardProfile ? " and its login" : ""} without merging two accounts.
                        </li>
                        <li>
                          Open the kept application afterward if you need to copy any details that
                          only exist on the duplicate.
                        </li>
                      </ul>
                    )}
                    {mergeBlockedBecauseSelf && (
                      <p className="text-destructive">
                        You are signed in as the account marked for removal. Choose the other record
                        to keep.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {selectedGroup && selectedGroup.applications.length >= 2 ? (
              <Button
                type="button"
                variant="secondary"
                disabled={working || dismissing}
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
            ) : null}
          </div>
          <Button
            type="button"
            disabled={
              working ||
              dismissing ||
              !keepApplication ||
              !discardApplication ||
              mergeBlockedBecauseSelf ||
              groups.length === 0
            }
            onClick={() => void runResolve()}
          >
            {working ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Working…
              </>
            ) : canMergeAccounts ? (
              "Merge into kept record"
            ) : (
              "Remove duplicate application"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
