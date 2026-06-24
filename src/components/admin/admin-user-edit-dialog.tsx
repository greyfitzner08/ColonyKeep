"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VolunteerEligibilityBadges } from "@/components/admin/volunteer-eligibility-badges";
import { ROLE_PERMISSIONS, isKnownUserRole } from "@/lib/constants";
import {
  OTHER_VOLUNTEER_ROLE,
  adminAssignableVolunteerRoles,
  volunteerRoleLabel,
} from "@/lib/volunteers/role-catalog";
import { cn } from "@/lib/utils";
import type {
  Profile,
  RoleDescription,
  TrapTeam,
  UserRole,
  VolunteerApplication,
  VolunteerRole,
} from "@/lib/types";

interface AdminUserEditDialogProps {
  user: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: TrapTeam[];
  roleCatalog: RoleDescription[];
  application: VolunteerApplication | undefined;
  teamEligible: boolean;
  onError: (message: string | null) => void;
}

export function AdminUserEditDialog({
  user,
  open,
  onOpenChange,
  teams,
  roleCatalog,
  application,
  teamEligible,
  onError,
}: AdminUserEditDialogProps) {
  const router = useRouter();
  const assignableRoles = useMemo(
    () => adminAssignableVolunteerRoles(roleCatalog),
    [roleCatalog]
  );

  const [platformRole, setPlatformRole] = useState<UserRole | "none">("none");
  const [fullName, setFullName] = useState("");
  const [teamId, setTeamId] = useState<string>("none");
  const [volunteerRoles, setVolunteerRoles] = useState<VolunteerRole[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPlatformRole(isKnownUserRole(user.role) ? user.role : "none");
    setFullName(user.full_name ?? "");
    setTeamId(user.team_id ?? "none");
    setVolunteerRoles(user.volunteer_roles ?? []);
  }, [user]);

  const otherRoleActive = user?.volunteer_roles?.includes(OTHER_VOLUNTEER_ROLE) ?? false;

  function toggleVolunteerRole(role: VolunteerRole) {
    setVolunteerRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  }

  async function saveChanges() {
    if (!user) return;

    setSaving(true);
    onError(null);

    const payload: {
      userId: string;
      role?: UserRole;
      teamId?: string | null;
      volunteer_roles?: VolunteerRole[];
      fullName?: string;
    } = { userId: user.id };

    const nextPlatformRole = platformRole === "none" ? null : platformRole;
    const nextTeamId = teamId === "none" ? null : teamId;
    const nextFullName = fullName.trim();

    if (!nextFullName) {
      onError("Name is required");
      setSaving(false);
      return;
    }

    if (nextFullName !== (user.full_name ?? "")) {
      payload.fullName = nextFullName;
    }

    if (nextPlatformRole !== user.role) {
      if (!nextPlatformRole) {
        onError("Platform role is required");
        setSaving(false);
        return;
      }
      payload.role = nextPlatformRole;
    }

    if (nextTeamId !== user.team_id) {
      payload.teamId = nextTeamId;
    }

    const preservedOther = otherRoleActive ? [OTHER_VOLUNTEER_ROLE] : [];
    const nextVolunteerRoles = [
      ...volunteerRoles.filter((role) => role !== OTHER_VOLUNTEER_ROLE),
      ...preservedOther,
    ];
    const currentRoles = user.volunteer_roles ?? [];
    const rolesChanged =
      nextVolunteerRoles.length !== currentRoles.length ||
      nextVolunteerRoles.some((role) => !currentRoles.includes(role));

    if (rolesChanged) {
      payload.volunteer_roles = nextVolunteerRoles;
    }

    if (!payload.role && payload.teamId === undefined && !payload.volunteer_roles && !payload.fullName) {
      onOpenChange(false);
      setSaving(false);
      return;
    }

    const response = await fetch("/api/admin/profiles/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      onError(result?.error ?? "Unable to save user changes");
      return;
    }

    onOpenChange(false);
    router.refresh();
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user.full_name ?? user.email}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <VolunteerEligibilityBadges application={application ?? undefined} />

          <div className="space-y-2">
            <Label htmlFor="admin-user-full-name">Full name</Label>
            <Input
              id="admin-user-full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Platform role</Label>
              <Select
                value={platformRole}
                onValueChange={(value) => setPlatformRole(value as UserRole | "none")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Platform role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No role</SelectItem>
                  {Object.entries(ROLE_PERMISSIONS).map(([role, { label }]) => (
                    <SelectItem key={role} value={role}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls app access level (admin, trap lead, volunteer, etc.).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Trap team</Label>
              <Select
                value={teamId}
                onValueChange={setTeamId}
                disabled={platformRole === "none" || !teamEligible}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Trap team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!teamEligible && platformRole !== "none" && (
                <p className="text-xs text-muted-foreground">
                  Team assignment unlocks after application approval and required training.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Volunteer interests</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Same options as the volunteer signup form. &quot;Other&quot; can only be selected
                during signup.
              </p>
            </div>

            {otherRoleActive && (
              <Badge variant="secondary">
                {volunteerRoleLabel(OTHER_VOLUNTEER_ROLE, roleCatalog)} (signup only)
              </Badge>
            )}

            <div className="flex flex-wrap gap-2">
              {assignableRoles.map((entry) => {
                const active = volunteerRoles.includes(entry.role_id);
                return (
                  <button
                    key={entry.role_id}
                    type="button"
                    onClick={() => toggleVolunteerRole(entry.role_id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={saveChanges} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
