"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { LIABILITY_WAIVER_URL, POLICY_URL } from "@/lib/constants";
import {
  getMissingUserCompletableRequirements,
  missingRequirementLabels,
  volunteerRolesForRequirementCheck,
} from "@/lib/volunteers/application-requirements";
import { volunteerRoleLabel, resolveVolunteerRoleCatalog } from "@/lib/volunteers/role-catalog";
import type { Profile, VolunteerApplication } from "@/lib/types";

interface VolunteerRequirementsGateProps {
  profile: Profile;
  application: VolunteerApplication;
}

export function VolunteerRequirementsGate({
  profile,
  application,
}: VolunteerRequirementsGateProps) {
  const router = useRouter();
  const [liabilityOpened, setLiabilityOpened] = useState(application.liability_waiver_signed);
  const [policyOpened, setPolicyOpened] = useState(application.policy_signed);
  const [liabilitySigned, setLiabilitySigned] = useState(application.liability_waiver_signed);
  const [policySigned, setPolicySigned] = useState(application.policy_signed);
  const [certUploaded, setCertUploaded] = useState(application.tnvr_certificate_uploaded);
  const [certUrl, setCertUrl] = useState(application.tnvr_certificate_url);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initialMissing = getMissingUserCompletableRequirements(profile, application);
  const pendingApplication = {
    ...application,
    liability_waiver_signed: liabilitySigned,
    policy_signed: policySigned,
    tnvr_certificate_uploaded: certUploaded,
    tnvr_certificate_url: certUrl,
  };
  const stillMissing = getMissingUserCompletableRequirements(profile, pendingApplication);
  const needsCert = initialMissing.includes("tnvr_certificate_uploaded");

  const submitDisabled = submitting || stillMissing.length > 0;

  const roleCatalog = resolveVolunteerRoleCatalog([]);
  const roles = volunteerRolesForRequirementCheck(profile, application);

  async function handleCertUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const supabase = createClient();
    const path = `applications/${profile.id}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("certificates").upload(path, file);
    if (!error) {
      setCertUploaded(true);
      setCertUrl(path);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    const response = await fetch("/api/volunteers/complete-requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        liability_waiver_opened: liabilityOpened,
        liability_waiver_signed: liabilitySigned,
        policy_opened: policyOpened,
        policy_signed: policySigned,
        tnvr_certificate_uploaded: certUploaded,
        tnvr_certificate_url: certUrl,
      }),
    });
    const result = await response.json().catch(() => null);
    setSubmitting(false);

    if (!response.ok) {
      setSubmitError(result?.error ?? "Unable to save requirements");
      return;
    }

    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background/95 p-4">
      <div className="mx-auto max-w-2xl py-6 space-y-4">
        <Card>
          <CardHeader className="text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle>Complete your volunteer requirements</CardTitle>
            <CardDescription>
              Before using the volunteer portal, finish the documents and uploads required for your
              roles.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-2">
              <p>
                <span className="font-medium">Your roles:</span>{" "}
                {roles.map((role) => volunteerRoleLabel(role, roleCatalog)).join(", ")}
              </p>
              <p className="text-muted-foreground">
                Still needed: {missingRequirementLabels(profile, application).join(", ")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {initialMissing.includes("liability_waiver_signed") && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="req-waiver"
                    checked={liabilitySigned}
                    disabled={!liabilityOpened}
                    onCheckedChange={(value) => setLiabilitySigned(!!value)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="req-waiver">
                      I have read and agree to the{" "}
                      <a
                        href={LIABILITY_WAIVER_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                        onClick={() => setLiabilityOpened(true)}
                      >
                        Liability Waiver
                      </a>
                    </Label>
                  </div>
                </div>
              )}

              {initialMissing.includes("policy_signed") && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="req-policy"
                    checked={policySigned}
                    disabled={!policyOpened}
                    onCheckedChange={(value) => setPolicySigned(!!value)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="req-policy">
                      I have read and agree to the{" "}
                      <a
                        href={POLICY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                        onClick={() => setPolicyOpened(true)}
                      >
                        Policy & Procedures
                      </a>
                    </Label>
                  </div>
                </div>
              )}

              {needsCert && (
                <div className="space-y-2 border-t pt-4">
                  <Label>TNVR certificate (required for trapping/transport roles)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleCertUpload}
                  />
                  {certUploaded && (
                    <p className="text-sm text-primary">Certificate uploaded successfully</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitDisabled}>
                {submitting ? "Saving..." : "Save and continue"}
              </Button>
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
