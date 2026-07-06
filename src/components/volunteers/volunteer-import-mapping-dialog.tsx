"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VolunteerImportFieldKey } from "@/lib/volunteers/import-mapper";
import type { VolunteerImportRoleResolution } from "@/lib/volunteers/import-role-matcher";
import type { VolunteerImportColumnResolution } from "@/lib/volunteers/import-mapper";
import type { VolunteerImportMappingPreview } from "@/lib/volunteers/import-mapping";
import type { VolunteerRole } from "@/lib/types";
import { roleResolutionKey } from "@/lib/volunteers/import-mapping";
import { Loader2 } from "lucide-react";

type RoleAction = "map" | "create" | "skip";
type ColumnAction = "map" | "append_admin_notes" | "ignore";

interface VolunteerImportMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: VolunteerImportMappingPreview | null;
  importing: boolean;
  onConfirm: (payload: {
    roleResolutions: Record<string, VolunteerImportRoleResolution>;
    columnResolutions: Record<string, VolunteerImportColumnResolution>;
  }) => void;
}

export function VolunteerImportMappingDialog({
  open,
  onOpenChange,
  mapping,
  importing,
  onConfirm,
}: VolunteerImportMappingDialogProps) {
  const [roleActions, setRoleActions] = useState<Record<string, RoleAction>>({});
  const [roleMapTargets, setRoleMapTargets] = useState<Record<string, string>>({});
  const [roleCreateLabels, setRoleCreateLabels] = useState<Record<string, string>>({});
  const [columnActions, setColumnActions] = useState<Record<string, ColumnAction>>({});
  const [columnMapTargets, setColumnMapTargets] = useState<
    Record<string, VolunteerImportFieldKey>
  >({});

  useEffect(() => {
    if (!mapping) return;

    const nextRoleActions: Record<string, RoleAction> = {};
    const nextRoleMapTargets: Record<string, string> = {};
    const nextRoleCreateLabels: Record<string, string> = {};
    for (const entry of mapping.unrecognizedRoles) {
      const key = roleResolutionKey(entry.token);
      nextRoleActions[key] = "create";
      nextRoleCreateLabels[key] = entry.token;
      nextRoleMapTargets[key] = mapping.availableRoles[0]?.role_id ?? "";
    }

    const nextColumnActions: Record<string, ColumnAction> = {};
    const nextColumnMapTargets: Record<string, VolunteerImportFieldKey> = {};
    for (const header of mapping.unmappedColumns) {
      nextColumnActions[header] = "append_admin_notes";
      nextColumnMapTargets[header] = "admin_notes";
    }

    setRoleActions(nextRoleActions);
    setRoleMapTargets(nextRoleMapTargets);
    setRoleCreateLabels(nextRoleCreateLabels);
    setColumnActions(nextColumnActions);
    setColumnMapTargets(nextColumnMapTargets);
  }, [mapping]);

  const summary = useMemo(() => {
    if (!mapping) return null;
    return {
      roles: mapping.unrecognizedRoles.length,
      columns: mapping.unmappedColumns.length,
    };
  }, [mapping]);

  function buildResolutions() {
    const roleResolutions: Record<string, VolunteerImportRoleResolution> = {};
    for (const entry of mapping?.unrecognizedRoles ?? []) {
      const key = roleResolutionKey(entry.token);
      const action = roleActions[key] ?? "create";
      if (action === "skip") {
        roleResolutions[key] = { action: "skip" };
        continue;
      }
      if (action === "map") {
        const roleId = roleMapTargets[key];
        if (roleId) {
          roleResolutions[key] = { action: "map", roleId: roleId as VolunteerRole };
        }
        continue;
      }
      const label = roleCreateLabels[key]?.trim() || entry.token;
      roleResolutions[key] = { action: "create", label };
    }

    const columnResolutions: Record<string, VolunteerImportColumnResolution> = {};
    for (const header of mapping?.unmappedColumns ?? []) {
      const action = columnActions[header] ?? "append_admin_notes";
      if (action === "ignore") {
        columnResolutions[header] = { action: "ignore" };
        continue;
      }
      if (action === "append_admin_notes") {
        columnResolutions[header] = { action: "append_admin_notes" };
        continue;
      }
      const field = columnMapTargets[header];
      if (field) {
        columnResolutions[header] = { action: "map", field };
      }
    }

    return { roleResolutions, columnResolutions };
  }

  const canConfirm = useMemo(() => {
    if (!mapping) return false;

    for (const entry of mapping.unrecognizedRoles) {
      const key = roleResolutionKey(entry.token);
      const action = roleActions[key] ?? "create";
      if (action === "map" && !roleMapTargets[key]) return false;
      if (action === "create" && !roleCreateLabels[key]?.trim()) return false;
    }

    for (const header of mapping.unmappedColumns) {
      const action = columnActions[header] ?? "append_admin_notes";
      if (action === "map" && !columnMapTargets[header]) return false;
    }

    return true;
  }, [mapping, roleActions, roleMapTargets, roleCreateLabels, columnActions, columnMapTargets]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Map CSV values</DialogTitle>
          <DialogDescription>
            {summary
              ? `${summary.roles} unrecognized role(s) and ${summary.columns} unmapped column(s) need your decision before import can continue.`
              : "Review unrecognized CSV values before importing."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {mapping && mapping.unrecognizedRoles.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Unrecognized roles</p>
              {mapping.unrecognizedRoles.map((entry) => {
                const key = roleResolutionKey(entry.token);
                const action = roleActions[key] ?? "create";
                return (
                  <div key={key} className="rounded-lg border p-4 space-y-3">
                    <div>
                      <p className="font-medium">{entry.token}</p>
                      <p className="text-sm text-muted-foreground">
                        Appears in {entry.rowCount} row{entry.rowCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`role-action-${key}`}>How to handle</Label>
                      <Select
                        value={action}
                        onValueChange={(value) =>
                          setRoleActions((current) => ({
                            ...current,
                            [key]: value as RoleAction,
                          }))
                        }
                      >
                        <SelectTrigger id={`role-action-${key}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="map">Map to existing role</SelectItem>
                          <SelectItem value="create">Create new role</SelectItem>
                          <SelectItem value="skip">Skip this role</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {action === "map" && (
                      <div className="space-y-2">
                        <Label htmlFor={`role-map-${key}`}>Existing role</Label>
                        <Select
                          value={roleMapTargets[key] ?? ""}
                          onValueChange={(value) =>
                            setRoleMapTargets((current) => ({ ...current, [key]: value }))
                          }
                        >
                          <SelectTrigger id={`role-map-${key}`}>
                            <SelectValue placeholder="Choose a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {mapping.availableRoles.map((role) => (
                              <SelectItem key={role.role_id} value={role.role_id}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {action === "create" && (
                      <div className="space-y-2">
                        <Label htmlFor={`role-create-${key}`}>New role name</Label>
                        <Input
                          id={`role-create-${key}`}
                          value={roleCreateLabels[key] ?? entry.token}
                          onChange={(event) =>
                            setRoleCreateLabels((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {mapping && mapping.unmappedColumns.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Unmapped columns</p>
              {mapping.unmappedColumns.map((header) => {
                const action = columnActions[header] ?? "append_admin_notes";
                return (
                  <div key={header} className="rounded-lg border p-4 space-y-3">
                    <div>
                      <p className="font-medium">{header}</p>
                      <p className="text-sm text-muted-foreground">
                        This column header does not match a standard import field.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`column-action-${header}`}>How to handle</Label>
                      <Select
                        value={action}
                        onValueChange={(value) =>
                          setColumnActions((current) => ({
                            ...current,
                            [header]: value as ColumnAction,
                          }))
                        }
                      >
                        <SelectTrigger id={`column-action-${header}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="map">Map to import field</SelectItem>
                          <SelectItem value="append_admin_notes">Append to admin notes</SelectItem>
                          <SelectItem value="ignore">Ignore column</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {action === "map" && (
                      <div className="space-y-2">
                        <Label htmlFor={`column-map-${header}`}>Import field</Label>
                        <Select
                          value={columnMapTargets[header] ?? ""}
                          onValueChange={(value) =>
                            setColumnMapTargets((current) => ({
                              ...current,
                              [header]: value as VolunteerImportFieldKey,
                            }))
                          }
                        >
                          <SelectTrigger id={`column-map-${header}`}>
                            <SelectValue placeholder="Choose a field" />
                          </SelectTrigger>
                          <SelectContent>
                            {mapping.importFieldOptions.map((field) => (
                              <SelectItem key={field.key} value={field.key}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(buildResolutions())}
            disabled={importing || !mapping || !canConfirm}
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              "Continue import"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
