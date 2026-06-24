"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { TNVR_ROLES, LIABILITY_WAIVER_URL, POLICY_URL } from "@/lib/constants";
import { ADULT_ONLY_VOLUNTEER_ROLES, isUnder18 } from "@/lib/volunteers/age-eligibility";
import {
  resolveVolunteerRoleCatalog,
  signupVolunteerRoleOptions,
} from "@/lib/volunteers/role-catalog";
import type { Profile, RoleDescription, VolunteerRole } from "@/lib/types";

interface VolunteerApplicationGateProps {
  profile: Profile;
}

export function VolunteerApplicationGate({ profile }: VolunteerApplicationGateProps) {
  const router = useRouter();
  const [roleDescriptions, setRoleDescriptions] = useState<RoleDescription[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [liabilityOpened, setLiabilityOpened] = useState(false);
  const [policyOpened, setPolicyOpened] = useState(false);

  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    email: profile.email,
    phone: "",
    birthday: profile.birthday ?? "",
    roles_requested: [] as VolunteerRole[],
    why_volunteer: "",
    prior_experience: "",
    how_heard: "",
    liability_waiver_signed: false,
    policy_signed: false,
    tnvr_certificate_uploaded: false,
    tnvr_certificate_url: null as string | null,
  });

  const roleCatalog = useMemo(
    () => resolveVolunteerRoleCatalog(roleDescriptions),
    [roleDescriptions]
  );
  const signupRoles = signupVolunteerRoleOptions(roleCatalog);
  const needsTnvrCert = form.roles_requested.some((role) => TNVR_ROLES.includes(role));
  const isMinor = form.birthday ? isUnder18(form.birthday) : false;

  const visibleRoles = signupRoles.filter((entry) => {
    if (!isMinor) return true;
    return !ADULT_ONLY_VOLUNTEER_ROLES.includes(entry.role_id);
  });

  const submitDisabled =
    submitting ||
    !form.full_name.trim() ||
    !form.phone.trim() ||
    !form.birthday ||
    !form.why_volunteer.trim() ||
    !liabilityOpened ||
    !policyOpened ||
    !form.liability_waiver_signed ||
    !form.policy_signed ||
    form.roles_requested.length === 0 ||
    (needsTnvrCert && !form.tnvr_certificate_uploaded);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("role_descriptions").select("*").then(({ data, error }) => {
      if (!error && data) {
        setRoleDescriptions(data as RoleDescription[]);
      }
    });
  }, []);

  function toggleRole(role: VolunteerRole) {
    if (isMinor && ADULT_ONLY_VOLUNTEER_ROLES.includes(role)) return;
    setForm((prev) => ({
      ...prev,
      roles_requested: prev.roles_requested.includes(role)
        ? prev.roles_requested.filter((item) => item !== role)
        : [...prev.roles_requested, role],
    }));
  }

  async function handleCertUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const supabase = createClient();
    const path = `applications/${profile.id}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("certificates").upload(path, file);
    if (!error) {
      setForm((prev) => ({
        ...prev,
        tnvr_certificate_uploaded: true,
        tnvr_certificate_url: path,
      }));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    const response = await fetch("/api/volunteers/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        email: profile.email,
        liability_waiver_opened: liabilityOpened,
        policy_opened: policyOpened,
      }),
    });
    const result = await response.json().catch(() => null);
    setSubmitting(false);

    if (!response.ok) {
      setSubmitError(result?.error ?? "Unable to submit application");
      return;
    }

    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background/95 p-4">
      <div className="mx-auto max-w-2xl py-6 space-y-4">
        <Card>
          <CardHeader className="text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle>Complete your volunteer application</CardTitle>
            <CardDescription>
              We don&apos;t have an application on file for your account yet. Please submit one
              before using the volunteer portal.
            </CardDescription>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Birthday (required)</Label>
                <Input
                  type="date"
                  value={form.birthday}
                  onChange={(e) => {
                    const nextBirthday = e.target.value;
                    setForm((prev) => {
                      const minor = nextBirthday ? isUnder18(nextBirthday) : false;
                      const roles = minor
                        ? prev.roles_requested.filter(
                            (role) => !ADULT_ONLY_VOLUNTEER_ROLES.includes(role)
                          )
                        : prev.roles_requested;
                      return { ...prev, birthday: nextBirthday, roles_requested: roles };
                    });
                  }}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Roles of Interest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleRoles.map((entry) => (
                <div key={entry.role_id} className="rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id={`gate-${entry.role_id}`}
                      checked={form.roles_requested.includes(entry.role_id)}
                      onCheckedChange={() => toggleRole(entry.role_id)}
                    />
                    <div>
                      <Label htmlFor={`gate-${entry.role_id}`} className="font-medium">
                        {entry.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-0.5">{entry.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About You</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Why do you want to volunteer?</Label>
                <Textarea
                  value={form.why_volunteer}
                  onChange={(e) => setForm({ ...form, why_volunteer: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Prior experience with cats or TNVR</Label>
                <Textarea
                  value={form.prior_experience}
                  onChange={(e) => setForm({ ...form, prior_experience: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>How did you hear about us?</Label>
                <Input
                  value={form.how_heard}
                  onChange={(e) => setForm({ ...form, how_heard: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="gate-waiver"
                  checked={form.liability_waiver_signed}
                  disabled={!liabilityOpened}
                  onCheckedChange={(value) =>
                    setForm({ ...form, liability_waiver_signed: !!value })
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="gate-waiver">
                    I agree to the{" "}
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
              <div className="flex items-start gap-2">
                <Checkbox
                  id="gate-policy"
                  checked={form.policy_signed}
                  disabled={!policyOpened}
                  onCheckedChange={(value) => setForm({ ...form, policy_signed: !!value })}
                />
                <div className="space-y-1">
                  <Label htmlFor="gate-policy">
                    I agree to the{" "}
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
              {needsTnvrCert && (
                <div className="space-y-2 border-t pt-4">
                  <Label>TNVR certificate (required for trapping/transport roles)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleCertUpload}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={submitDisabled}>
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
          {submitError && <p className="text-sm text-destructive text-center">{submitError}</p>}
        </form>
      </div>
    </div>
  );
}
