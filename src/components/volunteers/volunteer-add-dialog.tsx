"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getEmailValidationError } from "@/lib/email-utils";
import { cn } from "@/lib/utils";
import { resolveVolunteerRoleCatalog, volunteerRoleLabel } from "@/lib/volunteers/role-catalog";
import type { RoleDescription, VolunteerApplication, VolunteerRole } from "@/lib/types";
import { Plus, ChevronDown } from "lucide-react";

interface VolunteerAddDialogProps {
  roleDescriptions: RoleDescription[];
  disabledRoleIds?: VolunteerRole[];
  triggerVariant?: "default" | "icon";
  onCreated?: (applicationId: string) => void;
}

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  birthday: "",
  roles: [] as VolunteerRole[],
  adminNotes: "",
  setupLogin: true,
};

export function VolunteerAddDialog({
  roleDescriptions,
  disabledRoleIds = [],
  triggerVariant = "default",
  onCreated,
}: VolunteerAddDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedRoles, setExpandedRoles] = useState<Set<VolunteerRole>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleOptions = useMemo(
    () => resolveVolunteerRoleCatalog(roleDescriptions, disabledRoleIds),
    [roleDescriptions, disabledRoleIds]
  );

  const emailInvalid = Boolean(form.email.trim() && getEmailValidationError(form.email));

  function resetForm() {
    setForm(EMPTY_FORM);
    setExpandedRoles(new Set());
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  function toggleRole(roleId: VolunteerRole) {
    setForm((current) => ({
      ...current,
      roles: current.roles.includes(roleId)
        ? current.roles.filter((role) => role !== roleId)
        : [...current.roles, roleId],
    }));
  }

  function toggleRoleDescription(roleId: VolunteerRole) {
    setExpandedRoles((current) => {
      const next = new Set(current);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);

    if (!form.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (getEmailValidationError(form.email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (form.roles.length === 0) {
      setError("Select at least one volunteer role.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/volunteers/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        birthday: form.birthday.trim() || undefined,
        roles: form.roles,
        adminNotes: form.adminNotes.trim() || undefined,
      }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setSaving(false);
      setError(getApiErrorMessage(result, "Unable to add volunteer"));
      return;
    }

    const applicationId = result.application?.id as string | undefined;

    if (form.setupLogin && applicationId) {
      const approveResponse = await fetch("/api/volunteers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          email: form.email.trim(),
          volunteer_roles: form.roles,
        }),
      });
      const approveResult = await approveResponse.json().catch(() => null);
      if (!approveResponse.ok) {
        setSaving(false);
        setError(
          getApiErrorMessage(
            approveResult,
            "Volunteer was added but login setup failed. Open them in Review to finish setup."
          )
        );
        router.refresh();
        if (applicationId) onCreated?.(applicationId);
        return;
      }
    }

    setSaving(false);
    handleOpenChange(false);
    router.refresh();
    if (applicationId) onCreated?.(applicationId);
  }

  return (
    <>
      {triggerVariant === "icon" ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setOpen(true)}
          title="Add volunteer"
          aria-label="Add volunteer"
        >
          <Plus className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add volunteer
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add volunteer</DialogTitle>
            <DialogDescription>
              Enter the basics now. You can add address, training, and trap team from Review after
              saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="add-volunteer-name">Full name</Label>
                <Input
                  id="add-volunteer-name"
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-volunteer-email">Email</Label>
                <Input
                  id="add-volunteer-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  autoComplete="email"
                />
                {emailInvalid && (
                  <p className="text-sm text-destructive">Enter a valid email address.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-volunteer-phone">Phone</Label>
                <Input
                  id="add-volunteer-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="add-volunteer-birthday">Birthday</Label>
                <Input
                  id="add-volunteer-birthday"
                  type="date"
                  value={form.birthday}
                  onChange={(event) => setForm({ ...form, birthday: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Volunteer roles</Label>
              <div className="rounded-md border divide-y">
                {roleOptions.map((entry) => {
                  const selected = form.roles.includes(entry.role_id);
                  const expanded = expandedRoles.has(entry.role_id);
                  const description = entry.description?.trim();
                  const roleLabel = volunteerRoleLabel(entry.role_id, roleOptions);

                  return (
                    <div key={entry.role_id} className={cn(selected && "bg-primary/5")}>
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          id={`add-volunteer-role-${entry.role_id}`}
                          checked={selected}
                          onCheckedChange={() => toggleRole(entry.role_id)}
                        />
                        <label
                          htmlFor={`add-volunteer-role-${entry.role_id}`}
                          className="min-w-0 flex-1 cursor-pointer text-sm font-medium leading-snug"
                        >
                          {roleLabel}
                        </label>
                        {description && (
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => toggleRoleDescription(entry.role_id)}
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Hide" : "Show"} description for ${roleLabel}`}
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                expanded && "rotate-180"
                              )}
                            />
                          </button>
                        )}
                      </div>
                      {expanded && description && (
                        <p className="px-3 pb-2.5 pl-9 text-xs text-muted-foreground">
                          {description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-volunteer-notes">Admin notes (optional)</Label>
              <Textarea
                id="add-volunteer-notes"
                value={form.adminNotes}
                onChange={(event) => setForm({ ...form, adminNotes: event.target.value })}
                rows={2}
              />
            </div>

            <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={form.setupLogin}
                onCheckedChange={(value) => setForm({ ...form, setupLogin: value === true })}
              />
              <span>
                <span className="font-medium">Approve and create login account</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Recommended. Sets them up to sign in immediately. Training can be completed later.
                </span>
              </span>
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? "Adding…" : form.setupLogin ? "Add & set up login" : "Add volunteer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
