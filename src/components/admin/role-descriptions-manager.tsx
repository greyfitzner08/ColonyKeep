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
import { createClient } from "@/lib/supabase/client";
import { resolveVolunteerRoleCatalog, signupVolunteerRoleOptions } from "@/lib/volunteers/role-catalog";
import {
  REQUIREMENT_FIELD_OPTIONS,
  displayRequirementLabel,
  isKnownRequirementField,
} from "@/lib/volunteers/role-requirements";
import type { RoleDescription } from "@/lib/types";
import { Pencil, Plus, X } from "lucide-react";

interface RoleDescriptionsManagerProps {
  roleDescriptions: RoleDescription[];
}

export function RoleDescriptionsManager({ roleDescriptions }: RoleDescriptionsManagerProps) {
  const router = useRouter();
  const catalog = useMemo(
    () => resolveVolunteerRoleCatalog(roleDescriptions),
    [roleDescriptions]
  );

  const selectableRoles = useMemo(() => signupVolunteerRoleOptions(catalog), [catalog]);

  const [editingRole, setEditingRole] = useState<RoleDescription | null>(null);
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [presetToAdd, setPresetToAdd] = useState<string>("");
  const [customRequirement, setCustomRequirement] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availablePresets = useMemo(
    () => REQUIREMENT_FIELD_OPTIONS.filter((option) => !requirements.includes(option.key)),
    [requirements]
  );

  useEffect(() => {
    if (!editingRole) return;
    setDescription(editingRole.description);
    setRequirements(editingRole.requirements ?? []);
    setPresetToAdd("");
    setCustomRequirement("");
    setError(null);
  }, [editingRole]);

  function addPresetRequirement() {
    if (!presetToAdd || requirements.includes(presetToAdd)) return;
    setRequirements((current) => [...current, presetToAdd]);
    setPresetToAdd("");
  }

  function addCustomRequirement() {
    const label = customRequirement.trim();
    if (!label) return;
    if (requirements.some((item) => item.toLowerCase() === label.toLowerCase())) {
      setError("That requirement is already on this role.");
      return;
    }
    setRequirements((current) => [...current, label]);
    setCustomRequirement("");
    setError(null);
  }

  function removeRequirement(value: string) {
    setRequirements((current) => current.filter((item) => item !== value));
  }

  async function saveRole() {
    if (!editingRole) return;

    setSaving(true);
    setError(null);
    const supabase = createClient();

    const payload = {
      description: description.trim(),
      requirements,
    };

    const response = editingRole.id.startsWith("default-")
      ? await supabase.from("role_descriptions").upsert(
          {
            role_id: editingRole.role_id,
            label: editingRole.label,
            ...payload,
          },
          { onConflict: "role_id" }
        )
      : await supabase
          .from("role_descriptions")
          .update(payload)
          .eq("id", editingRole.id);

    setSaving(false);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    setEditingRole(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage volunteer role descriptions and approval requirements. Tracked requirements
        (waiver, training, etc.) sync with volunteer applications; custom requirements are
        manual checklists for admins.
      </p>

      <div className="rounded-lg border overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_auto] gap-3 px-4 py-3 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
          <span>Role</span>
          <span>Requirements</span>
          <span>Description</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y">
          {selectableRoles.map((role) => {
            const roleRequirements = role.requirements ?? [];

            return (
              <div
                key={role.role_id}
                className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_auto] md:items-start"
              >
                <div>
                  <p className="font-medium">{role.label}</p>
                  <p className="text-xs text-muted-foreground">{role.role_id.replace(/_/g, " ")}</p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {roleRequirements.length === 0 ? (
                    <span className="text-sm text-muted-foreground">None</span>
                  ) : (
                    roleRequirements.map((requirement) => (
                      <Badge
                        key={requirement}
                        variant={isKnownRequirementField(requirement) ? "secondary" : "outline"}
                        className="text-[11px]"
                      >
                        {displayRequirementLabel(requirement)}
                      </Badge>
                    ))
                  )}
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {role.description || "—"}
                </p>

                <div className="md:text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingRole(role)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={editingRole != null} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editingRole && (
            <>
              <DialogHeader>
                <DialogTitle>{editingRole.label}</DialogTitle>
                <DialogDescription>
                  Update the public description and approval requirements for this volunteer role.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
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
                      Add tracked system requirements or custom labels. Remove any requirement
                      that should not block approval for this role.
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

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingRole(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={saveRole} disabled={saving || !description.trim()}>
                  {saving ? "Saving…" : "Save role"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
