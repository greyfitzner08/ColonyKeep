"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminUserEditDialog } from "@/components/admin/admin-user-edit-dialog";
import { ROLE_PERMISSIONS, isKnownUserRole } from "@/lib/constants";
import {
  getApplicationByEmail,
  getTeamEligibleVolunteers,
} from "@/lib/volunteers/eligibility";
import { resolveVolunteerRoleCatalog, volunteerRoleLabel } from "@/lib/volunteers/role-catalog";
import type {
  Profile,
  RoleDescription,
  TrapTeam,
  UserRole,
  VolunteerApplication,
} from "@/lib/types";
import { Pencil, Search } from "lucide-react";

interface AdminUsersManagerProps {
  users: Profile[];
  teams: TrapTeam[];
  roleDescriptions: RoleDescription[];
  applications: VolunteerApplication[];
}

const MAX_ROLE_BADGES = 3;

export function AdminUsersManager({
  users,
  teams,
  roleDescriptions,
  applications,
}: AdminUsersManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const [savingNameId, setSavingNameId] = useState<string | null>(null);

  const roleCatalog = useMemo(
    () => resolveVolunteerRoleCatalog(roleDescriptions),
    [roleDescriptions]
  );

  const teamById = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams]
  );

  const eligibleVolunteers = useMemo(
    () => getTeamEligibleVolunteers(applications, users),
    [applications, users]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!query) return true;

      const volunteerRoleText = (user.volunteer_roles ?? [])
        .map((role) => volunteerRoleLabel(role, roleCatalog))
        .join(" ");

      return [
        user.full_name,
        user.email,
        user.role,
        teamById.get(user.team_id ?? ""),
        volunteerRoleText,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [users, search, roleFilter, teamById, roleCatalog]);

  function nameForUser(user: Profile) {
    return nameEdits[user.id] ?? user.full_name ?? "";
  }

  async function saveUserName(user: Profile) {
    const fullName = nameForUser(user).trim();
    if (!fullName) {
      setUserError("Name is required");
      return;
    }
    if (fullName === (user.full_name ?? "")) return;

    setUserError(null);
    setSavingNameId(user.id);
    const response = await fetch("/api/admin/profiles/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, fullName }),
    });
    const result = await response.json().catch(() => null);
    setSavingNameId(null);

    if (!response.ok) {
      setUserError(result?.error ?? "Unable to update name");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      {userError && <p className="text-sm text-destructive">{userError}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, team, or volunteer role…"
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Platform role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platform roles</SelectItem>
            {Object.entries(ROLE_PERMISSIONS).map(([role, { label }]) => (
              <SelectItem key={role} value={role}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground sm:ml-auto">
          {filteredUsers.length} of {users.length} users
        </p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_auto] gap-3 px-4 py-3 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
          <span>Name</span>
          <span>Email</span>
          <span>Platform role</span>
          <span>Team</span>
          <span>Volunteer interests</span>
          <span className="text-right">Actions</span>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No users match your search.
          </p>
        ) : (
          <div className="divide-y">
            {filteredUsers.map((user) => {
              const application = getApplicationByEmail(applications, user.email);
              const teamEligible = eligibleVolunteers.some(
                (entry) => entry.profile.id === user.id
              );
              const roles = user.volunteer_roles ?? [];
              const visibleRoles = roles.slice(0, MAX_ROLE_BADGES);
              const hiddenRoleCount = Math.max(0, roles.length - MAX_ROLE_BADGES);

              return (
                <div
                  key={user.id}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        aria-label={`Full name for ${user.email}`}
                        value={nameForUser(user)}
                        onChange={(event) =>
                          setNameEdits((prev) => ({ ...prev, [user.id]: event.target.value }))
                        }
                        className="h-8 max-w-[220px] text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={
                          savingNameId === user.id || nameForUser(user).trim() === (user.full_name ?? "")
                        }
                        onClick={() => saveUserName(user)}
                      >
                        {savingNameId === user.id ? "Saving…" : "Save"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                  </div>
                  <p className="text-sm text-muted-foreground truncate hidden md:block">
                    {user.email}
                  </p>
                  <div>
                    <Badge variant="outline">
                      {isKnownUserRole(user.role)
                        ? ROLE_PERMISSIONS[user.role].label
                        : "No role"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {user.team_id ? teamById.get(user.team_id) ?? "—" : "—"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {roles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">None</span>
                    ) : (
                      <>
                        {visibleRoles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-[11px]">
                            {volunteerRoleLabel(role, roleCatalog)}
                          </Badge>
                        ))}
                        {hiddenRoleCount > 0 && (
                          <Badge variant="outline" className="text-[11px]">
                            +{hiddenRoleCount}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  <div className="md:text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUserError(null);
                        setEditingUser(user);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdminUserEditDialog
        user={editingUser}
        open={editingUser != null}
        onOpenChange={(open) => !open && setEditingUser(null)}
        teams={teams}
        roleCatalog={roleCatalog}
        application={
          editingUser
            ? getApplicationByEmail(applications, editingUser.email) ?? undefined
            : undefined
        }
        teamEligible={
          editingUser
            ? eligibleVolunteers.some((entry) => entry.profile.id === editingUser.id)
            : false
        }
        onError={setUserError}
      />
    </div>
  );
}
