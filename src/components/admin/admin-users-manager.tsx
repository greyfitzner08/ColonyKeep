"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { AdminUserEditDialog } from "@/components/admin/admin-user-edit-dialog";
import { AdminUserRemoveDialog } from "@/components/admin/admin-user-remove-dialog";
import { getApiErrorMessage } from "@/lib/api/errors";
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
import { Pencil, Search, Trash2 } from "lucide-react";

interface AdminUsersManagerProps {
  users: Profile[];
  teams: TrapTeam[];
  roleDescriptions: RoleDescription[];
  applications: VolunteerApplication[];
  currentUserId: string;
}

const MAX_ROLE_BADGES = 3;

export function AdminUsersManager({
  users,
  teams,
  roleDescriptions,
  applications,
  currentUserId,
}: AdminUsersManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<UserRole | "">("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [removingUser, setRemovingUser] = useState<Profile | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

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

  const selectableUsers = useMemo(
    () => filteredUsers.filter((user) => user.id !== currentUserId),
    [filteredUsers, currentUserId]
  );

  const allVisibleSelected =
    selectableUsers.length > 0 && selectableUsers.every((user) => selected.has(user.id));

  const selectedCount = selected.size;

  const toggleRow = useCallback((id: string) => {
    if (id === currentUserId) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [currentUserId]);

  const toggleAllVisible = useCallback(() => {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const user of selectableUsers) next.delete(user.id);
        return next;
      });
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      for (const user of selectableUsers) next.add(user.id);
      return next;
    });
  }, [allVisibleSelected, selectableUsers]);

  const updateUserRole = useCallback(
    async (userId: string, role: UserRole) => {
      if (userId === currentUserId) return;

      setUpdatingRoleId(userId);
      setUserError(null);

      const response = await fetch("/api/admin/profiles/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const result = await response.json().catch(() => null);
      setUpdatingRoleId(null);

      if (!response.ok) {
        setUserError(getApiErrorMessage(result, "Unable to update platform role"));
        return;
      }

      router.refresh();
    },
    [currentUserId, router]
  );

  const applyBulkRole = useCallback(async () => {
    const userIds = [...selected].filter((id) => id !== currentUserId);
    if (!userIds.length || !bulkRole) return;

    setBulkBusy(true);
    setUserError(null);

    const response = await fetch("/api/admin/profiles/bulk-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds, role: bulkRole }),
    });
    const result = await response.json().catch(() => null);
    setBulkBusy(false);

    if (!response.ok) {
      setUserError(getApiErrorMessage(result, "Unable to update platform roles"));
      return;
    }

    setSelected(new Set());
    setBulkRole("");
    router.refresh();
  }, [bulkRole, currentUserId, router, selected]);

  const columns = useMemo((): DataTableColumn<Profile>[] => {
    return [
      {
        id: "select",
        label: "Select",
        header: (
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={toggleAllVisible}
            aria-label="Select all visible users"
            disabled={selectableUsers.length === 0}
          />
        ),
        defaultWidth: 52,
        minWidth: 52,
        render: (user) => (
          <Checkbox
            checked={selected.has(user.id)}
            onCheckedChange={() => toggleRow(user.id)}
            disabled={user.id === currentUserId}
            aria-label={`Select ${user.full_name ?? user.email}`}
          />
        ),
      },
      {
        id: "name",
        label: "Name",
        defaultWidth: 180,
        sortValue: (user) => user.full_name?.trim() || user.email,
        render: (user) => (
          <span className="truncate font-medium">{user.full_name?.trim() || "—"}</span>
        ),
      },
      {
        id: "email",
        label: "Email",
        defaultWidth: 220,
        sortValue: (user) => user.email,
        render: (user) => <span className="truncate text-muted-foreground">{user.email}</span>,
      },
      {
        id: "platform_role",
        label: "Platform role",
        defaultWidth: 180,
        sortValue: (user) =>
          isKnownUserRole(user.role) ? ROLE_PERMISSIONS[user.role].label : "No role",
        render: (user) => {
          const isSelf = user.id === currentUserId;
          const isUpdating = updatingRoleId === user.id;

          if (isSelf) {
            return (
              <Badge variant="outline">
                {isKnownUserRole(user.role) ? ROLE_PERMISSIONS[user.role].label : "No role"}
              </Badge>
            );
          }

          return (
            <Select
              value={isKnownUserRole(user.role) ? user.role : undefined}
              disabled={isUpdating}
              onValueChange={(value) => updateUserRole(user.id, value as UserRole)}
            >
              <SelectTrigger className="h-8 w-full max-w-[170px]">
                <SelectValue placeholder={isUpdating ? "Saving…" : "No role"} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_PERMISSIONS).map(([role, { label }]) => (
                  <SelectItem key={role} value={role}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        id: "team",
        label: "Team",
        defaultWidth: 120,
        sortValue: (user) => (user.team_id ? teamById.get(user.team_id) ?? "" : ""),
        render: (user) => (
          <span className="text-muted-foreground">
            {user.team_id ? teamById.get(user.team_id) ?? "—" : "—"}
          </span>
        ),
      },
      {
        id: "volunteer_roles",
        label: "Volunteer interests",
        defaultWidth: 220,
        sortValue: (user) =>
          (user.volunteer_roles ?? [])
            .map((role) => volunteerRoleLabel(role, roleCatalog))
            .join(", "),
        render: (user) => {
          const roles = user.volunteer_roles ?? [];
          const visibleRoles = roles.slice(0, MAX_ROLE_BADGES);
          const hiddenRoleCount = Math.max(0, roles.length - MAX_ROLE_BADGES);
          if (roles.length === 0) {
            return <span className="text-xs text-muted-foreground">None</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
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
            </div>
          );
        },
      },
      {
        id: "actions",
        label: "Actions",
        defaultWidth: 88,
        minWidth: 80,
        headerClassName: "text-right",
        cellClassName: "text-right",
        render: (user) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setUserError(null);
                setEditingUser(user);
              }}
              aria-label={`Edit ${user.full_name ?? user.email}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {user.id !== currentUserId ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => {
                  setUserError(null);
                  setRemovingUser(user);
                }}
                aria-label={`Remove ${user.full_name ?? user.email}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ];
  }, [
    allVisibleSelected,
    currentUserId,
    roleCatalog,
    selectableUsers.length,
    selected,
    teamById,
    toggleAllVisible,
    toggleRow,
    updateUserRole,
    updatingRoleId,
  ]);

  return (
    <div className="space-y-4">
      {userError && <p className="text-sm text-destructive">{userError}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
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

      {selectedCount > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center">
          <p className="text-sm font-medium">
            {selectedCount} selected
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Select
              value={bulkRole || undefined}
              onValueChange={(value) => setBulkRole(value as UserRole)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Set platform role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_PERMISSIONS).map(([role, { label }]) => (
                  <SelectItem key={role} value={role}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!bulkRole || bulkBusy}
              onClick={applyBulkRole}
            >
              {bulkBusy ? "Applying…" : "Apply to selected"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={bulkBusy}
              onClick={() => {
                setSelected(new Set());
                setBulkRole("");
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <DataTable
        tableId="admin-users"
        columns={columns}
        rows={filteredUsers}
        getRowKey={(user) => user.id}
        emptyMessage="No users match your search."
        enableSearch={false}
      />

      <p className="text-xs text-muted-foreground">
        Change platform roles inline in the table, or select multiple users for bulk updates. Your
        own account cannot be changed here. Use Edit for contact details, volunteer interests, and
        trap team assignment. Birthday is collected when users log in.
      </p>

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

      <AdminUserRemoveDialog
        user={removingUser}
        users={users}
        open={removingUser != null}
        onOpenChange={(open) => !open && setRemovingUser(null)}
        onError={setUserError}
      />
    </div>
  );
}
