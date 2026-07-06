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
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import {
  VolunteerContactFieldsForm,
  emptyVolunteerContactFormValues,
  type VolunteerContactFormValues,
} from "@/components/volunteers/volunteer-contact-fields-form";
import { isHomeAddressComplete } from "@/lib/volunteers/contact-fields";
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
  const [contact, setContact] = useState<VolunteerContactFormValues>(emptyVolunteerContactFormValues());
  const [teamId, setTeamId] = useState<string>("none");
  const [volunteerRoles, setVolunteerRoles] = useState<VolunteerRole[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPlatformRole(isKnownUserRole(user.role) ? user.role : "none");
    setContact({
      full_name: user.full_name ?? "",
      email: user.email,
      phone: user.phone ?? "",
      birthday: user.birthday ?? "",
      home_street: user.home_street ?? "",
      home_city: user.home_city ?? "",
      home_state: user.home_state ?? "",
      home_zip: user.home_zip ?? "",
      home_county: user.home_county ?? "",
    });
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

    const payload: Record<string, unknown> = { userId: user.id };

    const nextPlatformRole = platformRole === "none" ? null : platformRole;
    const nextTeamId = teamId === "none" ? null : teamId;

    if (!contact.full_name.trim()) {
      onError("Name is required");
      setSaving(false);
      return;
    }
    if (!contact.phone.trim()) {
      onError("Phone is required");
      setSaving(false);
      return;
    }
    if (!isHomeAddressComplete(contact)) {
      onError("Home street, city, ZIP code, and county are required");
      setSaving(false);
      return;
    }

    if (contact.full_name.trim() !== (user.full_name ?? "")) payload.fullName = contact.full_name.trim();
    if (contact.email.trim() !== user.email) payload.email = contact.email.trim();
    if (contact.phone.trim() !== (user.phone ?? "")) payload.phone = contact.phone.trim();
    if ((contact.birthday || "") !== (user.birthday ?? "")) payload.birthday = contact.birthday || null;
    if (contact.home_street.trim() !== (user.home_street ?? "")) {
      payload.home_street = contact.home_street.trim();
    }
    if (contact.home_city.trim() !== (user.home_city ?? "")) {
      payload.home_city = contact.home_city.trim();
    }
    if (contact.home_state.trim() !== (user.home_state ?? "")) {
      payload.home_state = contact.home_state.trim();
    }
    if (contact.home_zip.trim() !== (user.home_zip ?? "")) payload.home_zip = contact.home_zip.trim();
    if (contact.home_county.trim() !== (user.home_county ?? "")) {
      payload.home_county = contact.home_county.trim();
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

    const hasContactChanges = Object.keys(payload).some(
      (key) => !["userId", "role", "teamId", "volunteer_roles"].includes(key)
    );

    if (!payload.role && payload.teamId === undefined && !payload.volunteer_roles && !hasContactChanges) {
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user.full_name ?? user.email}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <VolunteerEligibilityBadges application={application ?? undefined} profile={user} />

          <VolunteerContactFieldsForm
            values={contact}
            onChange={setContact}
            showBirthday
            idPrefix={`admin-user-${user.id}`}
          />

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
                  {sortTrapTeams(teams).map((team) => (
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
                during signup. Liability waiver and policy are completed by the volunteer at
                sign-in, not here.
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
