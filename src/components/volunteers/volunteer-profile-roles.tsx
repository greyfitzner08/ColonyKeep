"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  missingRequirementsForRole,
  requirementLabel,
  rolesNeedingTnvrCert,
} from "@/lib/volunteers/role-requirements";
import { volunteerRequirementSource } from "@/lib/volunteers/requirement-source";
import type { Profile, VolunteerApplication, VolunteerRole, VolunteerRoleRequest } from "@/lib/types";

interface VolunteerProfileRolesProps {
  profile: Profile;
  application: VolunteerApplication | null;
  roleRequests: VolunteerRoleRequest[];
}

function roleLabel(role: VolunteerRole) {
  return VOLUNTEER_ROLES.find((entry) => entry.value === role)?.label ?? role;
}

export function VolunteerProfileRoles({
  profile,
  application,
  roleRequests,
}: VolunteerProfileRolesProps) {
  const router = useRouter();
  const [selectedRoles, setSelectedRoles] = useState<VolunteerRole[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certUploaded, setCertUploaded] = useState(
    application?.tnvr_certificate_uploaded ?? profile.tnvr_certificate_uploaded ?? false
  );
  const [certFileName, setCertFileName] = useState<string | null>(
    (application?.tnvr_certificate_url ?? profile.tnvr_certificate_url)?.split("/").pop() ?? null
  );

  const approvedRoles = profile.volunteer_roles ?? [];
  const pendingRequests = roleRequests.filter((request) => request.status === "pending");
  const source = volunteerRequirementSource(application, {
    tnvr_certificate_uploaded: certUploaded || profile.tnvr_certificate_uploaded,
    tnvr_certificate_url: profile.tnvr_certificate_url,
  });

  const availableToRequest = VOLUNTEER_ROLES.filter(
    (entry) =>
      !approvedRoles.includes(entry.value) &&
      !pendingRequests.some((request) => request.requested_roles.includes(entry.value))
  );

  const needsCertForSelection =
    rolesNeedingTnvrCert(selectedRoles) && !(certUploaded || source.tnvr_certificate_uploaded);

  function toggleRole(role: VolunteerRole) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]
    );
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

  async function submitRequest() {
    if (selectedRoles.length === 0) return;
    if (needsCertForSelection) {
      setError("Upload your TNVR certificate before requesting trapping-related roles.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const response = await fetch("/api/volunteers/role-requests/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requested_roles: selectedRoles }),
    });
    const result = await response.json().catch(() => null);
    setSubmitting(false);
    if (!response.ok) {
      setError(result?.error ?? "Unable to submit role request");
      return;
    }
    setSelectedRoles([]);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">My Volunteer Roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Approved interests</p>
          {approvedRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved volunteer roles yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {approvedRoles.map((role) => (
                <Badge key={role}>{roleLabel(role)}</Badge>
              ))}
            </div>
          )}
        </div>

        {pendingRequests.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Pending role requests</p>
            {pendingRequests.map((request) => (
              <div key={request.id} className="rounded-md border p-3 text-sm space-y-2">
                <div className="flex flex-wrap gap-2">
                  {request.requested_roles.map((role) => (
                    <Badge key={role} variant="outline">{roleLabel(role)}</Badge>
                  ))}
                </div>
                <p className="text-muted-foreground">Waiting for admin review</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">TNVR certificate</p>
          <p className="text-sm text-muted-foreground">
            Required for trapping, transport, trap loan, and recovery roles. PDF or image files accepted.
          </p>
          {certUploaded ? (
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

        {availableToRequest.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Request additional roles</p>
            <p className="text-sm text-muted-foreground">
              Your current permissions stay the same while new roles are reviewed.
            </p>
            {needsCertForSelection && (
              <p className="text-sm text-amber-700">
                Upload your TNVR certificate above before submitting trapping-related roles.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableToRequest.map(({ value, label }) => {
                const missing = missingRequirementsForRole(value, source);
                return (
                  <div key={value} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedRoles.includes(value)}
                        onCheckedChange={() => toggleRole(value)}
                      />
                      <Label className="font-normal">{label}</Label>
                    </div>
                    {missing.length > 0 && (
                      <p className="text-xs text-muted-foreground pl-6">
                        Needs: {missing.map(requirementLabel).join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={submitRequest}
              disabled={submitting || selectedRoles.length === 0 || needsCertForSelection}
            >
              {submitting ? "Submitting…" : "Request selected roles"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
