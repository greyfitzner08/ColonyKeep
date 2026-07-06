"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getEmailValidationError } from "@/lib/email-utils";
import { cn } from "@/lib/utils";
import { resolveVolunteerRoleCatalog, volunteerRoleLabel } from "@/lib/volunteers/role-catalog";
import type { RoleDescription, VolunteerApplicationStatus, VolunteerRole } from "@/lib/types";
import { Plus } from "lucide-react";

interface VolunteerAddDialogProps {
  roleDescriptions: RoleDescription[];
  disabledRoleIds?: VolunteerRole[];
  triggerVariant?: "default" | "icon";
}

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  birthday: "",
  roles: [] as VolunteerRole[],
  whyVolunteer: "",
  priorExperience: "",
  howHeard: "",
  liabilityWaiverSigned: false,
  policySigned: false,
  tnvrCertificateUploaded: false,
  applicationStatus: "pending" as VolunteerApplicationStatus,
  adminNotes: "",
};

export function VolunteerAddDialog({
  roleDescriptions,
  disabledRoleIds = [],
  triggerVariant = "default",
}: VolunteerAddDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const roleOptions = useMemo(
    () => resolveVolunteerRoleCatalog(roleDescriptions, disabledRoleIds),
    [roleDescriptions, disabledRoleIds]
  );

  const emailInvalid = Boolean(form.email.trim() && getEmailValidationError(form.email));

  function resetForm() {
    setForm(EMPTY_FORM);
    setError(null);
    setMessage(null);
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

  async function handleSubmit() {
    setError(null);
    setMessage(null);

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
        whyVolunteer: form.whyVolunteer.trim() || undefined,
        priorExperience: form.priorExperience.trim() || undefined,
        howHeard: form.howHeard.trim() || undefined,
        liabilityWaiverSigned: form.liabilityWaiverSigned,
        policySigned: form.policySigned,
        tnvrCertificateUploaded: form.tnvrCertificateUploaded,
        applicationStatus: form.applicationStatus,
        adminNotes: form.adminNotes.trim() || undefined,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(getApiErrorMessage(result, "Unable to add volunteer"));
      return;
    }

    setMessage(`Added volunteer application for ${result.application?.full_name ?? form.fullName}.`);
    router.refresh();
    setTimeout(() => handleOpenChange(false), 1200);
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add volunteer</DialogTitle>
            <DialogDescription>
              Create a volunteer application manually. Fields match CSV import. The volunteer will
              still need to accept the liability waiver and policy on first login, even if marked
              signed here.
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

              <div className="space-y-2">
                <Label htmlFor="add-volunteer-birthday">Birthday</Label>
                <Input
                  id="add-volunteer-birthday"
                  type="date"
                  value={form.birthday}
                  onChange={(event) => setForm({ ...form, birthday: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-volunteer-status">Application status</Label>
                <Select
                  value={form.applicationStatus}
                  onValueChange={(value) =>
                    setForm({ ...form, applicationStatus: value as VolunteerApplicationStatus })
                  }
                >
                  <SelectTrigger id="add-volunteer-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="needs_followup">Needs follow-up</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Roles requested</Label>
              <p className="text-xs text-muted-foreground">
                Select one or more volunteer roles. Options match Admin → Volunteer Roles.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {roleOptions.map((entry) => {
                  const selected = form.roles.includes(entry.role_id);
                  return (
                    <label
                      key={entry.role_id}
                      htmlFor={`add-volunteer-role-${entry.role_id}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                        selected ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                      )}
                    >
                      <Checkbox
                        id={`add-volunteer-role-${entry.role_id}`}
                        className="mt-0.5"
                        checked={selected}
                        onCheckedChange={() => toggleRole(entry.role_id)}
                      />
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {volunteerRoleLabel(entry.role_id, roleOptions)}
                        </p>
                        {entry.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {entry.description}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="add-volunteer-why">Why volunteer</Label>
                <Textarea
                  id="add-volunteer-why"
                  value={form.whyVolunteer}
                  onChange={(event) => setForm({ ...form, whyVolunteer: event.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-volunteer-experience">Prior experience</Label>
                <Textarea
                  id="add-volunteer-experience"
                  value={form.priorExperience}
                  onChange={(event) => setForm({ ...form, priorExperience: event.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-volunteer-how-heard">How heard</Label>
                <Input
                  id="add-volunteer-how-heard"
                  value={form.howHeard}
                  onChange={(event) => setForm({ ...form, howHeard: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Training & documents</p>
              <p className="text-xs text-muted-foreground">
                Waivers and policy must still be accepted by the volunteer at sign-in.
              </p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.liabilityWaiverSigned}
                    onCheckedChange={(value) =>
                      setForm({ ...form, liabilityWaiverSigned: value === true })
                    }
                  />
                  Liability waiver signed
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.policySigned}
                    onCheckedChange={(value) => setForm({ ...form, policySigned: value === true })}
                  />
                  Policy acknowledgement
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.tnvrCertificateUploaded}
                    onCheckedChange={(value) =>
                      setForm({ ...form, tnvrCertificateUploaded: value === true })
                    }
                  />
                  TNVR certificate uploaded
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-volunteer-notes">Admin notes</Label>
              <Textarea
                id="add-volunteer-notes"
                value={form.adminNotes}
                onChange={(event) => setForm({ ...form, adminNotes: event.target.value })}
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? "Adding…" : "Add volunteer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
