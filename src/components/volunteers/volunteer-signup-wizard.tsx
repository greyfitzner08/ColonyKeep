"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Cat,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  HandHeart,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { TNVR_ROLES, LIABILITY_WAIVER_URL, POLICY_URL } from "@/lib/constants";
import {
  filterSignupRolesForAge,
  isRoleAllowedOnSignup,
  isMinorVolunteer,
  MINOR_SIGNUP_VOLUNTEER_ROLES,
} from "@/lib/volunteers/age-eligibility";
import {
  resolveVolunteerRoleCatalog,
  signupVolunteerRoleOptions,
  filterSignupRoleDescriptions,
  volunteerRoleLabel,
} from "@/lib/volunteers/role-catalog";
import { isHomeAddressComplete, formatHomeAddress } from "@/lib/volunteers/contact-fields";
import {
  VolunteerContactFieldsForm,
  type VolunteerContactFormValues,
} from "@/components/volunteers/volunteer-contact-fields-form";
import type { Profile, RoleDescription, VolunteerRole } from "@/lib/types";

const STEPS = [
  {
    label: "About You",
    category: "personal" as const,
    description: "Your name, contact info, home address, and birthday",
  },
  {
    label: "Roles",
    category: "roles" as const,
    description: "How you would like to help the team",
  },
  {
    label: "Background",
    category: "personal" as const,
    description: "Your experience and what drew you to TNVR",
  },
  {
    label: "Requirements",
    category: "requirements" as const,
    description: "Waivers and any role-specific documents",
  },
  {
    label: "Review",
    category: "review" as const,
    description: "Confirm your application before submitting",
  },
];

type StepCategory = (typeof STEPS)[number]["category"];

function FormSectionBanner({
  variant,
  title,
  description,
}: {
  variant: Exclude<StepCategory, "review">;
  title: string;
  description: string;
}) {
  const styles =
    variant === "personal"
      ? "border-blue-200 bg-blue-50 text-blue-950"
      : variant === "roles"
        ? "border-violet-200 bg-violet-50 text-violet-950"
        : "border-slate-200 bg-slate-50 text-slate-950";

  const Icon = variant === "personal" ? User : variant === "roles" ? HandHeart : ClipboardCheck;

  return (
    <div className={`rounded-lg border px-4 py-3 ${styles}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm opacity-80 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

function stepPillClass(category: StepCategory, index: number, currentStep: number) {
  if (index === currentStep) {
    if (category === "roles") return "bg-violet-600 text-white border-violet-600";
    if (category === "personal") return "bg-blue-600 text-white border-blue-600";
    if (category === "requirements") return "bg-slate-700 text-white border-slate-700";
    return "bg-primary text-white border-primary";
  }
  if (index < currentStep) {
    if (category === "roles") return "bg-violet-100 text-violet-900 border-violet-200";
    if (category === "personal") return "bg-blue-100 text-blue-900 border-blue-200";
    if (category === "requirements") return "bg-slate-100 text-slate-900 border-slate-200";
    return "bg-primary/20 text-primary border-primary/20";
  }
  return "bg-muted text-muted-foreground border-transparent";
}

export interface VolunteerSignupWizardProps {
  variant: "page" | "gate";
  profile?: Pick<
    Profile,
    | "id"
    | "full_name"
    | "email"
    | "birthday"
    | "phone"
    | "volunteer_roles"
    | "home_street"
    | "home_city"
    | "home_state"
    | "home_zip"
    | "home_county"
  >;
  onSubmitted?: () => void;
}

export function VolunteerSignupWizard({ variant, profile, onSubmitted }: VolunteerSignupWizardProps) {
  const [step, setStep] = useState(0);
  const [roleDescriptions, setRoleDescriptions] = useState<RoleDescription[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [liabilityOpened, setLiabilityOpened] = useState(false);
  const [policyOpened, setPolicyOpened] = useState(false);

  const [form, setForm] = useState(() => {
    const birthday = profile?.birthday ?? "";
    const initialRoles = profile?.volunteer_roles?.length
      ? filterSignupRolesForAge(profile.volunteer_roles, birthday)
      : [];

    return {
      full_name: profile?.full_name ?? "",
      email: profile?.email ?? "",
      phone: profile?.phone ?? "",
      birthday,
      home_street: profile?.home_street ?? "",
      home_city: profile?.home_city ?? "",
      home_state: profile?.home_state ?? "",
      home_zip: profile?.home_zip ?? "",
      home_county: profile?.home_county ?? "",
      roles_requested: initialRoles as VolunteerRole[],
      prior_experience: "",
      how_heard: "",
      liability_waiver_signed: false,
      policy_signed: false,
      tnvr_certificate_uploaded: false,
      tnvr_certificate_url: null as string | null,
    };
  });

  const roleCatalog = useMemo(
    () => resolveVolunteerRoleCatalog(roleDescriptions),
    [roleDescriptions]
  );
  const signupRoles = signupVolunteerRoleOptions(roleCatalog);
  const visibleRoleDescriptions = filterSignupRoleDescriptions(signupRoles, form.birthday);
  const needsTnvrCert = form.roles_requested.some((role) => TNVR_ROLES.includes(role));
  const isMinor = isMinorVolunteer(form.birthday);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("role_descriptions").select("*").then(({ data, error }) => {
      if (!error && data) {
        setRoleDescriptions(data as RoleDescription[]);
      }
    });
  }, []);

  function toggleRole(role: VolunteerRole) {
    if (!isRoleAllowedOnSignup(role, form.birthday)) return;
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
    const prefix = profile?.id ? `applications/${profile.id}` : "applications";
    const path = `${prefix}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("certificates").upload(path, file);
    if (!error) {
      setForm((prev) => ({
        ...prev,
        tnvr_certificate_uploaded: true,
        tnvr_certificate_url: path,
      }));
    }
  }

  function canAdvanceFromStep(currentStep: number) {
    if (currentStep === 0) {
      return Boolean(
        form.full_name.trim() &&
          (variant === "gate" ? true : form.email.trim()) &&
          form.phone.trim() &&
          form.birthday &&
          isHomeAddressComplete(form)
      );
    }
    if (currentStep === 1) {
      return form.roles_requested.length > 0;
    }
    if (currentStep === 2) {
      return true;
    }
    if (currentStep === 3) {
      return (
        liabilityOpened &&
        policyOpened &&
        form.liability_waiver_signed &&
        form.policy_signed
      );
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);

    const response = await fetch("/api/volunteers/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        email: variant === "gate" && profile ? profile.email : form.email,
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

    if (onSubmitted) {
      onSubmitted();
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <CheckCircle className="mx-auto h-16 w-16 text-primary" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Application Submitted</h2>
              <p className="text-muted-foreground">
                Thank you for applying! Our team will review your application. You&apos;ll receive
                an email once you&apos;re approved and can access the volunteer portal.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Sign in</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Sign in with the email you used on this application to check your status after
              approval.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bannerTitle =
    step === 0
      ? "About you"
      : step === 1
        ? "Roles you are interested in"
        : step === 2
          ? "Your background"
          : "Requirements";

  const formBody = (
    <>
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {STEPS.map((entry, index) => (
          <div
            key={entry.label}
            className={`text-xs px-2 py-1 rounded-full border ${stepPillClass(entry.category, index, step)}`}
          >
            {entry.label}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {STEPS[step].category !== "review" && (
            <FormSectionBanner
              variant={STEPS[step].category}
              title={bannerTitle}
              description={STEPS[step].description}
            />
          )}

          {step === 0 && (
            <VolunteerContactFieldsForm
              values={form as VolunteerContactFormValues}
              onChange={(values) =>
                setForm((prev) => ({
                  ...prev,
                  ...values,
                  ...(values.birthday !== prev.birthday
                    ? {
                        roles_requested: filterSignupRolesForAge(
                          prev.roles_requested,
                          values.birthday
                        ),
                      }
                    : {}),
                }))
              }
              emailReadOnly={variant === "gate"}
              showBirthday
              idPrefix="signup-contact"
            />
          )}

          {step === 1 && (
            <>
              {isMinor ? (
                <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 p-3">
                  Volunteers under 18 can apply for{" "}
                  {MINOR_SIGNUP_VOLUNTEER_ROLES.map((role) =>
                    volunteerRoleLabel(role, signupRoles)
                  ).join(", ")}
                  . Roles such as trapping, transport, and recovery space hosting require you to be
                  18 or older.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 p-3">
                  Select every role you are interested in. You can request additional roles later
                  from your volunteer profile.
                </p>
              )}
              {visibleRoleDescriptions.map((entry) => (
                <div key={entry.role_id} className="rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id={`role-${entry.role_id}`}
                      checked={form.roles_requested.includes(entry.role_id)}
                      onCheckedChange={() => toggleRole(entry.role_id)}
                    />
                    <div>
                      <Label htmlFor={`role-${entry.role_id}`} className="font-medium">
                        {entry.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-0.5">{entry.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Prior experience with cats or TNVR</Label>
                <Textarea
                  value={form.prior_experience}
                  onChange={(e) => setForm({ ...form, prior_experience: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>How did you hear about us?</Label>
                <Input
                  value={form.how_heard}
                  onChange={(e) => setForm({ ...form, how_heard: e.target.value })}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="waiver"
                  checked={form.liability_waiver_signed}
                  disabled={!liabilityOpened}
                  onCheckedChange={(value) =>
                    setForm({ ...form, liability_waiver_signed: !!value })
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="waiver">
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
                  {!liabilityOpened && (
                    <p className="text-xs text-muted-foreground">
                      Open the waiver link before you can agree.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="policy"
                  checked={form.policy_signed}
                  disabled={!policyOpened}
                  onCheckedChange={(value) => setForm({ ...form, policy_signed: !!value })}
                />
                <div className="space-y-1">
                  <Label htmlFor="policy">
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
                  {!policyOpened && (
                    <p className="text-xs text-muted-foreground">
                      Open the policy link before you can agree.
                    </p>
                  )}
                </div>
              </div>
              {needsTnvrCert && (
                <div className="space-y-2 border-t pt-4">
                  <Label>TNVR certificate (optional now)</Label>
                  <p className="text-xs text-muted-foreground">
                    You can upload your TNVR certificate now or later. Before you can be assigned to a
                    trap team, staff will verify your certificate and shadow training.
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleCertUpload}
                  />
                  {form.tnvr_certificate_uploaded && (
                    <p className="text-sm text-primary">Certificate uploaded successfully</p>
                  )}
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                <p className="font-semibold text-blue-950 flex items-center gap-2">
                  <User className="h-4 w-4" aria-hidden />
                  About you
                </p>
                <p>
                  {form.full_name} — {variant === "gate" && profile ? profile.email : form.email} —{" "}
                  {form.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">Birthday:</span> {form.birthday}
                </p>
                <p>
                  <span className="text-muted-foreground">Home address:</span>{" "}
                  {formatHomeAddress(form)}
                </p>
              </div>

              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 space-y-2">
                <p className="font-semibold text-violet-950 flex items-center gap-2">
                  <HandHeart className="h-4 w-4" aria-hidden />
                  Roles of interest
                </p>
                <p>
                  {form.roles_requested
                    .map((role) => volunteerRoleLabel(role, signupRoles))
                    .join(", ")}
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-semibold">Background</p>
                {form.prior_experience && (
                  <p>
                    <span className="text-muted-foreground">Experience:</span> {form.prior_experience}
                  </p>
                )}
                {form.how_heard && (
                  <p>
                    <span className="text-muted-foreground">How you heard about us:</span>{" "}
                    {form.how_heard}
                  </p>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-1">
                <p className="font-semibold">Requirements</p>
                <p className="text-muted-foreground">
                  Liability waiver and Policy Acknowledgement complete
                  {needsTnvrCert
                    ? form.tnvr_certificate_uploaded
                      ? " · TNVR certificate uploaded"
                      : " · TNVR certificate can be provided before team assignment"
                    : ""}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canAdvanceFromStep(step)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            )}
          </div>
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        </CardContent>
      </Card>
    </>
  );

  if (variant === "gate") {
    return <div className="space-y-4">{formBody}</div>;
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
        {formBody}
      </div>
    </div>
  );
}
