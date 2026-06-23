"use client";

import { useState, useEffect } from "react";
import { Cat, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { TNVR_ROLES, VOLUNTEER_ROLES, LIABILITY_WAIVER_URL, POLICY_URL } from "@/lib/constants";
import type { VolunteerRole, RoleDescription } from "@/lib/types";
import Link from "next/link";

const DEFAULT_ROLE_DESCRIPTIONS: RoleDescription[] = VOLUNTEER_ROLES.map((role) => ({
  id: `default-${role.value}`,
  role_id: role.value,
  label: role.label,
  description: `Support the TNVR mission as a ${role.label.toLowerCase()}.`,
  created_at: "",
  updated_at: "",
}));

export default function VolunteerSignupPage() {
  const [roleDescriptions, setRoleDescriptions] = useState<RoleDescription[]>(DEFAULT_ROLE_DESCRIPTIONS);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    birthday: "",
    roles_requested: [] as VolunteerRole[],
    prior_experience: "",
    how_heard: "",
    liability_waiver_signed: false,
    policy_signed: false,
    tnvr_certificate_uploaded: false,
    tnvr_certificate_url: null as string | null,
  });

  const needsTnvrCert = form.roles_requested.some((r) => TNVR_ROLES.includes(r));
  const submitDisabled =
    submitting ||
    !form.liability_waiver_signed ||
    !form.policy_signed ||
    form.roles_requested.length === 0 ||
    (needsTnvrCert && !form.tnvr_certificate_uploaded);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("role_descriptions").select("*").then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        setRoleDescriptions(data as RoleDescription[]);
      }
    });
  }, []);

  function toggleRole(role: VolunteerRole) {
    setForm((prev) => ({
      ...prev,
      roles_requested: prev.roles_requested.includes(role)
        ? prev.roles_requested.filter((r) => r !== role)
        : [...prev.roles_requested, role],
    }));
  }

  async function handleCertUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const supabase = createClient();
    const path = `applications/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("certificates").upload(path, file);
    if (!error) {
      setForm((prev) => ({
        ...prev,
        tnvr_certificate_uploaded: true,
        tnvr_certificate_url: path,
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    const response = await fetch("/api/volunteers/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json().catch(() => null);
    setSubmitting(false);
    if (response.ok) {
      setSubmitted(true);
      return;
    }
    setSubmitError(result?.error ?? "Unable to submit application");
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CheckCircle className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle>Application Submitted</CardTitle>
            <CardDescription>
              Thank you for applying! Our team will review your application and contact you soon.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary mb-4">
            <Cat className="h-8 w-8" />
            <span className="text-xl font-semibold">TNVR Rescue</span>
          </Link>
          <h1 className="text-2xl font-bold">Volunteer Application</h1>
          <p className="text-muted-foreground mt-1">Join our team helping community cats</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Birthday</Label>
                <Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} required />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Roles of Interest</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {roleDescriptions.map((rd) => (
                <div key={rd.role_id} className="border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id={rd.role_id}
                      checked={form.roles_requested.includes(rd.role_id)}
                      onCheckedChange={() => toggleRole(rd.role_id)}
                    />
                    <div>
                      <Label htmlFor={rd.role_id} className="font-medium">{rd.label}</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">{rd.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">About You</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prior experience with cats or TNVR</Label>
                <Textarea value={form.prior_experience} onChange={(e) => setForm({ ...form, prior_experience: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>How did you hear about us?</Label>
                <Input value={form.how_heard} onChange={(e) => setForm({ ...form, how_heard: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-lg">Requirements</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="waiver"
                  checked={form.liability_waiver_signed}
                  onCheckedChange={(v) => setForm({ ...form, liability_waiver_signed: !!v })}
                />
                <Label htmlFor="waiver">
                  I have read and agree to the{" "}
                  <a href={LIABILITY_WAIVER_URL} target="_blank" rel="noopener" className="text-primary underline">Liability Waiver</a>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="policy"
                  checked={form.policy_signed}
                  onCheckedChange={(v) => setForm({ ...form, policy_signed: !!v })}
                />
                <Label htmlFor="policy">
                  I have read and agree to the{" "}
                  <a href="https://zealous-sherbet-f24.notion.site/Core-Policies-309a52ca229f817381b3cb6b68e5fadb" target="_blank" rel="noopener" className="text-primary underline">Policy & Procedures</a>
                </Label>
              </div>
              {needsTnvrCert && (
                <div className="space-y-2 border-t pt-4">
                  <Label>TNVR Certificate Upload (required for trapping/transport roles)</Label>
                  <Input type="file" name="tnvr_certificate" accept=".pdf,.jpg,.jpeg,.png" onChange={handleCertUpload} />
                  {form.tnvr_certificate_uploaded && (
                    <p className="text-sm text-primary">Certificate uploaded successfully</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full"
            disabled={submitDisabled}
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
          {submitError && (
            <p className="mt-2 text-sm text-destructive">{submitError}</p>
          )}
        </form>
      </div>
    </div>
  );
}
