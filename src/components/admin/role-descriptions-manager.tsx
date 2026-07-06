"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getApiErrorMessage } from "@/lib/api/errors";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  allVolunteerRoleOptions,
  resolveVolunteerRoleCatalog,
} from "@/lib/volunteers/role-catalog";
import { normalizeRoleId } from "@/lib/volunteers/role-id";
import {
  REQUIREMENT_FIELD_OPTIONS,
  displayRequirementLabel,
  isKnownRequirementField,
} from "@/lib/volunteers/role-requirements";
import type { RoleDescription, VolunteerRole } from "@/lib/types";
import { Pencil, Plus, Trash2, X } from "lucide-react";

interface RoleDescriptionsManagerProps {
  roleDescriptions: RoleDescription[];
  disabledRoleIds?: VolunteerRole[];
}

type EditorMode = "edit" | "create";

const PROTECTED_ROLE_IDS = new Set(["youth_volunteer", "other"]);

export function RoleDescriptionsManager({
  roleDescriptions,
  disabledRoleIds = [],
}: RoleDescriptionsManagerProps) {
  const router = useRouter();
  const catalog = useMemo(
    () => resolveVolunteerRoleCatalog(roleDescriptions, disabledRoleIds),
    [roleDescriptions, disabledRoleIds]
  );

  const allRoles = useMemo(() => allVolunteerRoleOptions(catalog), [catalog]);

  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editingRole, setEditingRole] = useState<RoleDescription | null>(null);
  const [label, setLabel] = useState("");
  const [roleId, setRoleId] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [presetToAdd, setPresetToAdd] = useState<string>("");
  const [customRequirement, setCustomRequirement] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<RoleDescription | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availablePresets = useMemo(
    () => REQUIREMENT_FIELD_OPTIONS.filter((option) => !requirements.includes(option.key)),
    [requirements]
  );

  const normalizedRoleId = normalizeRoleId(roleId || label);

  useEffect(() => {
    if (!editorMode) return;
    if (editorMode === "create") {
      setEditingRole(null);
      setLabel("");
      setRoleId("");
      setDescription("");
      setRequirements([]);
    } else if (editingRole) {
      setLabel(editingRole.label);
      setRoleId(editingRole.role_id);
      setDescription(editingRole.description);
      setRequirements(editingRole.requirements ?? []);
    }
    setPresetToAdd("");
    setCustomRequirement("");
    setError(null);
  }, [editorMode, editingRole]);

  function openCreateDialog() {
    setEditorMode("create");
  }

  function openEditDialog(role: RoleDescription) {
    setEditingRole(role);
    setEditorMode("edit");
  }

  function closeDialog() {
    setEditorMode(null);
    setEditingRole(null);
    setError(null);
  }

  function addPresetRequirement() {
    if (!presetToAdd || requirements.includes(presetToAdd)) return;
    setRequirements((current) => [...current, presetToAdd]);
    setPresetToAdd("");
  }

  function addCustomRequirement() {
    const value = customRequirement.trim();
    if (!value) return;
    if (requirements.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setError("That requirement is already on this role.");
      return;
    }
    setRequirements((current) => [...current, value]);
    setCustomRequirement("");
    setError(null);
  }

  function removeRequirement(value: string) {
    setRequirements((current) => current.filter((item) => item !== value));
  }

  async function saveRole() {
    setSaving(true);
    setError(null);

    const response = await fetch("/api/admin/role-descriptions/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id:
          editorMode === "edit" && editingRole && !editingRole.id.startsWith("default-")
            ? editingRole.id
            : undefined,
        role_id:
          editorMode === "edit" && editingRole
            ? editingRole.role_id
            : normalizedRoleId,
        label: label.trim(),
        description: description.trim(),
        requirements,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(getApiErrorMessage(result, "Unable to save role"));
      return;
    }

    closeDialog();
    router.refresh();
  }

  async function deleteRole(role: RoleDescription) {
    setDeleting(true);
    setError(null);

    const response = await fetch("/api/admin/role-descriptions/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: role.id,
        role_id: role.role_id,
      }),
    });
    const result = await response.json().catch(() => null);
    setDeleting(false);

    if (!response.ok) {
      setError(getApiErrorMessage(result, "Unable to remove role"));
      return;
    }

    setRoleToRemove(null);
    closeDialog();
    router.refresh();
  }

  function requestRemoveRole(role: RoleDescription) {
    if (PROTECTED_ROLE_IDS.has(role.role_id)) return;
    setRoleToRemove(role);
    setError(null);
  }

  function isRoleRemovable(role: RoleDescription): boolean {
    return !PROTECTED_ROLE_IDS.has(role.role_id);
  }

  const roleColumns = useMemo((): DataTableColumn<RoleDescription>[] => {
    return [
      {
        id: "role",
        label: "Role",
        defaultWidth: 200,
        render: (role) => (
          <div>
            <p className="font-medium">{role.label}</p>
            <p className="text-xs text-muted-foreground">{role.role_id.replace(/_/g, " ")}</p>
          </div>
        ),
      },
      {
        id: "requirements",
        label: "Requirements",
        defaultWidth: 240,
        render: (role) => {
          const roleRequirements = role.requirements ?? [];
          if (roleRequirements.length === 0) {
            return <span className="text-sm text-muted-foreground">None</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {roleRequirements.map((requirement) => (
                <Badge
                  key={requirement}
                  variant={isKnownRequirementField(requirement) ? "secondary" : "outline"}
                  className="text-[11px]"
                >
                  {displayRequirementLabel(requirement)}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "description",
        label: "Description",
        defaultWidth: 280,
        render: (role) => (
          <p className="line-clamp-2 text-sm text-muted-foreground">{role.description || "—"}</p>
        ),
      },
      {
        id: "actions",
        label: "Actions",
        defaultWidth: 160,
        minWidth: 140,
        headerClassName: "text-right",
        cellClassName: "text-right",
        render: (role) => (
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => openEditDialog(role)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            {isRoleRemovable(role) ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => requestRemoveRole(role)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
        ),
      },
    ];
  }, []);

  const canDelete = editorMode === "edit" && editingRole && isRoleRemovable(editingRole);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Add, rename, and remove volunteer roles. Each role has a display name, signup description,
          and approval requirements. Removing a role only works when no volunteers or applications
          still use it.
        </p>
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" />
          Add role
        </Button>
      </div>

      <DataTable
        tableId="admin-role-descriptions"
        columns={roleColumns}
        rows={allRoles}
        getRowKey={(role) => role.role_id}
        emptyMessage="No volunteer roles configured."
      />

      <Dialog open={editorMode != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editorMode && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {editorMode === "create" ? "Add volunteer role" : `Edit ${editingRole?.label}`}
                </DialogTitle>
                <DialogDescription>
                  {editorMode === "create"
                    ? "Create a new volunteer role for signup, applications, and permissions."
                    : "Update the display name, description, and approval requirements for this role."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="role-label">Role name</Label>
                  <Input
                    id="role-label"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="e.g. Fundraising"
                  />
                </div>

                {editorMode === "create" ? (
                  <div className="space-y-2">
                    <Label htmlFor="role-id">Role id</Label>
                    <Input
                      id="role-id"
                      value={roleId}
                      onChange={(event) => setRoleId(event.target.value)}
                      placeholder="fundraising"
                    />
                    <p className="text-xs text-muted-foreground">
                      Stored as <span className="font-mono">{normalizedRoleId || "…"}</span> — lowercase
                      letters, numbers, and underscores only.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>Role id</Label>
                    <p className="text-sm font-mono text-muted-foreground">{editingRole?.role_id}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="role-description">Description</Label>
                  <Textarea
                    id="role-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Approval requirements</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tracked requirements sync with volunteer applications. Custom labels are manual
                      admin checklists.
                    </p>
                  </div>

                  {requirements.length === 0 ? (
                    <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center">
                      No requirements — volunteers can be approved for this role immediately.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {requirements.map((requirement) => (
                        <li
                          key={requirement}
                          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {displayRequirementLabel(requirement)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isKnownRequirementField(requirement)
                                ? "Tracked automatically"
                                : "Custom — verify manually"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="shrink-0"
                            onClick={() => removeRequirement(requirement)}
                            aria-label={`Remove ${displayRequirementLabel(requirement)}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Add tracked requirement
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={presetToAdd}
                        onValueChange={setPresetToAdd}
                        disabled={availablePresets.length === 0}
                      >
                        <SelectTrigger className="flex-1 min-w-[200px]">
                          <SelectValue
                            placeholder={
                              availablePresets.length === 0
                                ? "All tracked requirements added"
                                : "Select requirement"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePresets.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!presetToAdd}
                        onClick={addPresetRequirement}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Add custom requirement
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={customRequirement}
                        onChange={(event) => setCustomRequirement(event.target.value)}
                        placeholder="e.g. Portfolio review"
                        className="flex-1 min-w-[200px]"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addCustomRequirement();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!customRequirement.trim()}
                        onClick={addCustomRequirement}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                {canDelete ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => editingRole && requestRemoveRole(editingRole)}
                    disabled={deleting || saving}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deleting ? "Removing…" : "Remove role"}
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={saveRole}
                    disabled={saving || deleting || !label.trim() || !description.trim()}
                  >
                    {saving ? "Saving…" : editorMode === "create" ? "Create role" : "Save changes"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={roleToRemove != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setRoleToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove volunteer role?</AlertDialogTitle>
            <AlertDialogDescription>
              {roleToRemove
                ? `"${roleToRemove.label}" will be removed from signup and role management. Existing volunteers or applications still using this role must be updated first.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && roleToRemove ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting || !roleToRemove}
              onClick={(event) => {
                event.preventDefault();
                if (roleToRemove) void deleteRole(roleToRemove);
              }}
            >
              {deleting ? "Removing…" : "Remove role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
