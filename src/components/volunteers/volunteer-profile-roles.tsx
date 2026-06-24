"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  resolveVolunteerRoleCatalog,
  signupVolunteerRoleOptions,
  volunteerRoleLabel,
} from "@/lib/volunteers/role-catalog";
import {
  missingRequirementsForRole,
  requirementLabel,
  rolesNeedingTnvrCert,
} from "@/lib/volunteers/role-requirements";
import { volunteerRequirementSource } from "@/lib/volunteers/requirement-source";
import { TNVR_ROLES } from "@/lib/constants";
import {
  isRoleAllowedOnSignup,
  isUnder18,
} from "@/lib/volunteers/age-eligibility";
import type { Profile, VolunteerApplication, VolunteerRole, VolunteerRoleRequest, RoleDescription } from "@/lib/types";

interface VolunteerProfileRolesProps {
  profile: Profile;
  application: VolunteerApplication | null;
  roleRequests: VolunteerRoleRequest[];
}

function roleLabel(role: VolunteerRole, catalog: RoleDescription[]) {
  return volunteerRoleLabel(role, catalog);
}

export function VolunteerProfileRoles({
  profile,
  application,
  roleRequests,
}: VolunteerProfileRolesProps) {
  const router = useRouter();
  const [roleDescriptions, setRoleDescriptions] = useState<RoleDescription[]>([]);
  const roleCatalog = useMemo(
    () => resolveVolunteerRoleCatalog(roleDescriptions),
    [roleDescriptions]
  );
  const signupRoles = useMemo(
    () => signupVolunteerRoleOptions(roleCatalog),
    [roleCatalog]
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.from("role_descriptions").select("*").then(({ data, error }) => {
      if (!error && data) {
        setRoleDescriptions(data as RoleDescription[]);
      }
    });
  }, []);

  const approvedRoles = useMemo(
    () => profile.volunteer_roles ?? [],
    [profile.volunteer_roles]
  );
  const birthday = profile.birthday ?? application?.birthday ?? null;
  const isMinor = birthday ? isUnder18(birthday) : false;

  const [selectedRoles, setSelectedRoles] = useState<VolunteerRole[]>(approvedRoles);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certUploaded, setCertUploaded] = useState(
    application?.tnvr_certificate_uploaded ?? profile.tnvr_certificate_uploaded ?? false
  );
  const [certFileName, setCertFileName] = useState<string | null>(
    (application?.tnvr_certificate_url ?? profile.tnvr_certificate_url)?.split("/").pop() ?? null
  );

  useEffect(() => {
    setSelectedRoles(approvedRoles);
  }, [approvedRoles, roleRequests]);

  const pendingRequests = roleRequests.filter((request) => request.status === "pending");

  const pendingAddRoles = useMemo(
    () =>
      pendingRequests
        .filter((request) => (request.request_type ?? "add") === "add")
        .flatMap((request) => request.requested_roles),
    [pendingRequests]
  );

  const pendingRemoveRoles = useMemo(
    () =>
      pendingRequests
        .filter((request) => request.request_type === "remove")
        .flatMap((request) => request.requested_roles),
    [pendingRequests]
  );

  const source = volunteerRequirementSource(application, {
    tnvr_certificate_uploaded: certUploaded,
    tnvr_certificate_url: profile.tnvr_certificate_url,
  });

  const hasCertOnFile =
    certUploaded &&
    Boolean(certFileName || profile.tnvr_certificate_url || application?.tnvr_certificate_url);

  function requirementSourceForPendingRole(role: VolunteerRole) {
    if (TNVR_ROLES.includes(role) && !approvedRoles.includes(role)) {
      return {
        ...source,
        tnvr_certificate_uploaded: certUploaded,
        shadow_completed: false,
      };
    }
    return source;
  }

  const visibleRoles = signupRoles.filter(({ role_id: value }) => {
    if (approvedRoles.includes(value)) return true;
    return isRoleAllowedOnSignup(value, birthday);
  });

  const rolesToAdd = selectedRoles.filter(
    (role) =>
      !approvedRoles.includes(role) &&
      !pendingAddRoles.includes(role) &&
      !pendingRemoveRoles.includes(role)
  );

  const rolesToRemove = approvedRoles.filter(
    (role) =>
      !selectedRoles.includes(role) &&
      !pendingAddRoles.includes(role) &&
      !pendingRemoveRoles.includes(role)
  );

  const needsCertForAdditions = rolesNeedingTnvrCert(rolesToAdd) && !certUploaded;

  const hasChanges = rolesToAdd.length > 0 || rolesToRemove.length > 0;

  function toggleRole(role: VolunteerRole) {
    if (!approvedRoles.includes(role) && !isRoleAllowedOnSignup(role, birthday)) {
      return;
    }
    if (pendingAddRoles.includes(role) || pendingRemoveRoles.includes(role)) return;

    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]
    );
  }

  function roleStatus(role: VolunteerRole): "approved" | "pending-add" | "pending-remove" | "none" {
    if (pendingAddRoles.includes(role)) return "pending-add";
    if (pendingRemoveRoles.includes(role)) return "pending-remove";
    if (approvedRoles.includes(role)) return "approved";
    return "none";
  }

  async function handleCertUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingCert(true);
    const supabase = createClient();
    const path = `${profile.id}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error: uploadError } = await supabase.storage.from("certificates").upload(path, file);

    if (uploadError) {
      setUploadingCert(false);
      setError(uploadError.message);
      return;
    }

    const response = await fetch("/api/volunteers/update-certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificate_url: path }),
    });
    const result = await response.json().catch(() => null);
    setUploadingCert(false);

    if (!response.ok) {
      setError(result?.error ?? "Certificate uploaded but could not be saved to your profile");
      return;
    }

    setCertUploaded(true);
    setCertFileName(file.name);
    router.refresh();
  }

  async function submitRoleChanges() {
    if (!hasChanges) return;

    if (rolesToAdd.some((role) => !isRoleAllowedOnSignup(role, birthday))) {
      setError(
        isMinor
          ? "Some selected roles are not available to volunteers under 18."
          : "One or more selected roles cannot be requested."
      );
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      if (rolesToAdd.length > 0) {
        const response = await fetch("/api/volunteers/role-requests/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requested_roles: rolesToAdd, request_type: "add" }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error ?? "Unable to submit role addition request");
        }
      }

      if (rolesToRemove.length > 0) {
        const response = await fetch("/api/volunteers/role-requests/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requested_roles: rolesToRemove, request_type: "remove" }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error ?? "Unable to submit role removal request");
        }
      }

      setSelectedRoles(approvedRoles);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit role changes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">My Volunteer Roles</CardTitle>
        <CardDescription>
          Check roles you want to keep or add. Uncheck an active role to request removal. Trapping-related
          roles require staff to verify your TNVR certificate and shadow shift before approval — selecting
          a role does not grant access until an admin approves it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium">Your volunteer interests</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visibleRoles.map(({ role_id: value, label, description }) => {
              const status = roleStatus(value);
              const checked = selectedRoles.includes(value) || status === "pending-add";
              const disabled = status === "pending-add" || status === "pending-remove";
              const missing = !approvedRoles.includes(value)
                ? missingRequirementsForRole(value, requirementSourceForPendingRole(value))
                : [];

              return (
                <div
                  key={value}
                  className={`rounded-lg border p-3 space-y-2 ${
                    status === "approved" ? "border-primary/30 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id={`role-${value}`}
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() => toggleRole(value)}
                    />
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={`role-${value}`} className="font-medium leading-snug">
                        {label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                      {status === "approved" && (
                        <p className="text-xs text-muted-foreground mt-0.5">Active — uncheck to request removal</p>
                      )}
                      {status === "pending-add" && (
                        <Badge variant="outline" className="mt-1 text-xs">Pending approval</Badge>
                      )}
                      {status === "pending-remove" && (
                        <Badge variant="outline" className="mt-1 text-xs">Removal pending</Badge>
                      )}
                      {missing.length > 0 && status === "none" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Needs: {missing.map(requirementLabel).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {isMinor && (
            <p className="text-xs text-muted-foreground">
              Under 18, you can request photographer, videographer, social media, crafter, and
              community outreach roles. Trapping and intake roles require you to be 18 or older.
            </p>
          )}
        </div>

        {pendingRequests.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
            <p className="font-medium">Pending requests</p>
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex flex-wrap gap-1.5">
                <span className="text-muted-foreground">
                  {(request.request_type ?? "add") === "remove" ? "Remove:" : "Add:"}
                </span>
                {request.requested_roles.map((role) => (
                  <Badge key={role} variant="secondary">{roleLabel(role, roleCatalog)}</Badge>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">TNVR certificate</p>
          <p className="text-sm text-muted-foreground">
            Stored on your profile even if you step back from trapping roles. Required again only
            when requesting new trapping-related roles without a certificate on file.
          </p>
          {hasCertOnFile ? (
            <p className="text-sm text-green-700">
              Certificate on file{certFileName ? `: ${certFileName}` : ""}. Upload again to replace it.
            </p>
          ) : (
            <p className="text-sm text-amber-700">No certificate uploaded yet.</p>
          )}
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={uploadingCert}
            onChange={handleCertUpload}
          />
          {uploadingCert && <p className="text-sm text-muted-foreground">Uploading…</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {needsCertForAdditions && (
          <p className="text-sm text-amber-700">
            Trapping-related roles need a TNVR certificate before staff can approve them. You can
            submit the request now and upload your certificate below.
          </p>
        )}

        <Button
          onClick={submitRoleChanges}
          disabled={submitting || !hasChanges}
        >
          {submitting ? "Submitting…" : "Submit role changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
