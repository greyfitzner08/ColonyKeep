"use client";

import { useState } from "react";
import Link from "next/link";
import { Cat, ChevronLeft, ChevronRight, CheckCircle, User, ExternalLink } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import { CountySelect } from "@/components/forms/county-select";
import { INTAKE_COMMUNICATIONS_NOTICE } from "@/lib/constants";
import { resolveCountyFromAutocomplete } from "@/lib/counties";
import {
  MECKLENBURG_RESOURCES_URL,
  getMecklenburgServiceAreaBlock,
  isMecklenburgCountyName,
} from "@/lib/mecklenburg-service-area";
import type { CommunityIntakeSubmission } from "@/lib/cases/public-intake";
import {
  buildFeederFieldsFromIntake,
  reporterIsColonyFeeder,
} from "@/lib/cases/public-intake";

const STEPS = [
  {
    label: "About Us",
    category: "intro" as const,
    description: "Who we are and how community help works",
  },
  {
    label: "About You",
    category: "reporter" as const,
    description: "Who is reporting this colony and how we can reach you",
  },
  {
    label: "Colony Location",
    category: "colony" as const,
    description: "Where the cats live",
  },
  {
    label: "About the Cats",
    category: "colony" as const,
    description: "How many cats are there and what is happening at the colony",
  },
  {
    label: "How You Can Help",
    category: "reporter" as const,
    description: "Your trapping experience and willingness to assist",
  },
  {
    label: "Review",
    category: "review" as const,
    description: "Confirm your report before submitting",
  },
];

function AboutUsStep({
  message,
  donateUrl,
  donateText,
}: {
  message: string;
  donateUrl: string | null;
  donateText: string;
}) {
  const paragraphs = message
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const includesConsent = /occasional communications/i.test(message);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">About us</h2>
        <p className="text-sm text-muted-foreground">
          A few things to know before you tell us about the colony.
        </p>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-foreground">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        {!includesConsent && <p>{INTAKE_COMMUNICATIONS_NOTICE}</p>}
      </div>
      {donateUrl && (
        <Button type="button" asChild>
          <a href={donateUrl} target="_blank" rel="noopener noreferrer">
            {donateText}
          </a>
        </Button>
      )}
    </div>
  );
}

function FormSectionBanner({
  variant,
  title,
  description,
}: {
  variant: "reporter" | "colony";
  title: string;
  description: string;
}) {
  const Icon = variant === "reporter" ? User : Cat;
  const styles =
    variant === "reporter"
      ? "border-blue-200 bg-blue-50 text-blue-950"
      : "border-amber-200 bg-amber-50 text-amber-950";

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

const EMPTY_FORM: CommunityIntakeSubmission = {
  contact_first_name: "",
  contact_last_name: "",
  contact_street: "",
  contact_city: "",
  contact_state: "",
  contact_zip: "",
  contact_county: "",
  contact_email: "",
  contact_phone: "",
  relationship_to_cats: "",
  colony_address: "",
  colony_city: "",
  colony_state: "",
  colony_county: "",
  colony_zip: "",
  colony_lat: null,
  colony_lng: null,
  apartment_name: "",
  kittens_under_8_weeks: 0,
  cats_over_8_weeks: 0,
  pregnant_count: 0,
  feeding_cats: "",
  feeder_if_not: "",
  trapping_experience: "",
  need_traps: "",
  willing_to_trap_transport: "",
  able_to_trap_transport: "",
  has_recovery_space: "",
  intake_notes: "",
  how_heard: "",
  consent_communications: false,
};

function homeAddressComplete(form: CommunityIntakeSubmission) {
  return Boolean(
    form.contact_street.trim() &&
      form.contact_city.trim() &&
      form.contact_zip.trim() &&
      form.contact_county.trim()
  );
}

function colonyAddressComplete(form: CommunityIntakeSubmission) {
  return Boolean(
    form.colony_address.trim() &&
      form.colony_city.trim() &&
      form.colony_zip.trim() &&
      form.colony_county.trim()
  );
}

function copyHomeAddressToColony(form: CommunityIntakeSubmission): CommunityIntakeSubmission {
  return {
    ...form,
    colony_address: form.contact_street,
    colony_city: form.contact_city,
    colony_state: form.contact_state,
    colony_zip: form.contact_zip,
    colony_county: form.contact_county,
    colony_lat: null,
    colony_lng: null,
  };
}

function formatHomeAddress(form: CommunityIntakeSubmission) {
  return [form.contact_street, form.contact_city, form.contact_state, form.contact_zip]
    .filter(Boolean)
    .join(", ");
}

function OutOfServiceAreaNotice({ reason }: { reason: "county" | "zip" }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 space-y-2"
    >
      <p className="font-semibold">
        {reason === "zip"
          ? "That ZIP code is outside Mecklenburg County"
          : "We can only help in Mecklenburg County right now"}
      </p>
      <p className="text-sm leading-relaxed">
        Friends of Feral Felines is unable to help with colonies in other counties at this time.
        Please use the link below to find TNVR and community-cat resources in neighboring counties.
      </p>
      <a
        href={MECKLENBURG_RESOURCES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-950 underline underline-offset-2 hover:text-amber-900"
      >
        Community cat resources by county
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
}

const CONTACT_ADDRESS_FIELDS = new Set<keyof CommunityIntakeSubmission>([
  "contact_street",
  "contact_city",
  "contact_state",
  "contact_zip",
  "contact_county",
]);

function YesNoSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  return (
    <Select value={value || "unset"} onValueChange={(v) => onChange(v === "unset" ? "" : v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unset">Select...</SelectItem>
        <SelectItem value="Yes">Yes</SelectItem>
        <SelectItem value="No">No</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ColonyIntakeForm({
  aboutMessage,
  donateUrl,
  donateText,
}: {
  aboutMessage: string;
  donateUrl: string | null;
  donateText: string;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<CommunityIntakeSubmission>(EMPTY_FORM);
  const [colonySameAsHome, setColonySameAsHome] = useState(true);

  function update<K extends keyof CommunityIntakeSubmission>(
    field: K,
    value: CommunityIntakeSubmission[K]
  ) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (colonySameAsHome && CONTACT_ADDRESS_FIELDS.has(field)) {
        return copyHomeAddressToColony(next);
      }
      return next;
    });
  }

  function setColonySameAsHomeChecked(checked: boolean) {
    setColonySameAsHome(checked);
    if (checked) {
      setForm((prev) => copyHomeAddressToColony(prev));
    } else {
      setForm((prev) => ({
        ...prev,
        colony_address: "",
        colony_city: "",
        colony_state: "",
        // Keep the service-area county the user already confirmed.
        colony_county: prev.colony_county || prev.contact_county,
        colony_zip: "",
        colony_lat: null,
        colony_lng: null,
      }));
    }
  }

  function setServiceCounty(county: string) {
    const normalized = isMecklenburgCountyName(county) ? "Mecklenburg" : county;
    setForm((prev) => {
      const next = {
        ...prev,
        colony_county: normalized,
        contact_county: colonySameAsHome ? normalized : prev.contact_county || normalized,
      };
      return colonySameAsHome ? copyHomeAddressToColony(next) : next;
    });
  }

  function intakeFormForSubmission(current = form) {
    return colonySameAsHome ? copyHomeAddressToColony(current) : current;
  }

  function handleRelationshipChange(value: string) {
    setForm((prev) => {
      const next = { ...prev, relationship_to_cats: value };
      if (/\bfeeder\b/i.test(value)) {
        next.feeding_cats = "Yes";
        next.feeder_if_not = "";
      }
      if (colonySameAsHome) {
        return copyHomeAddressToColony(next);
      }
      return next;
    });
  }

  function handleFeedingCatsChange(value: string) {
    setForm((prev) => ({
      ...prev,
      feeding_cats: value,
      feeder_if_not: value === "Yes" ? "" : prev.feeder_if_not,
    }));
  }

  const showFeederPreview = reporterIsColonyFeeder(form);
  const feederPreview = showFeederPreview ? buildFeederFieldsFromIntake(intakeFormForSubmission()) : null;

  const serviceCounty = form.colony_county || form.contact_county;
  const serviceZip = form.colony_zip || form.contact_zip;
  const serviceAreaBlock = getMecklenburgServiceAreaBlock({
    county: serviceCounty,
    zip: serviceZip,
  });
  const inServiceCounty = isMecklenburgCountyName(serviceCounty);
  const formUnlocked = inServiceCounty && serviceAreaBlock === null;
  // Only lock non-county fields when the county itself is out of area.
  // A bad ZIP must stay editable so typos can be fixed.
  const remainderLocked = Boolean(serviceCounty.trim()) && !inServiceCounty;

  function canAdvanceFromStep(currentStep: number) {
    if (currentStep === 0) return true;
    if (!formUnlocked) return false;
    if (currentStep === 1) {
      return Boolean(
        form.contact_first_name &&
          form.contact_last_name &&
          form.contact_email &&
          form.contact_phone &&
          serviceCounty
      );
    }
    if (currentStep === 2) {
      if (colonySameAsHome) {
        return homeAddressComplete(form);
      }
      return colonyAddressComplete(form);
    }
    return true;
  }

  function goToNextStep() {
    if (!canAdvanceFromStep(step)) return;
    if (step === 2 && colonySameAsHome) {
      setForm((prev) => copyHomeAddressToColony(prev));
    }
    setStep((current) => current + 1);
  }

  async function handleSubmit() {
    setSubmitError(null);

    const submission = {
      ...intakeFormForSubmission(),
      consent_communications: true,
    };
    const submitBlock = getMecklenburgServiceAreaBlock({
      county: submission.colony_county || submission.contact_county,
      zip: submission.colony_zip || submission.contact_zip,
    });
    if (!isMecklenburgCountyName(submission.colony_county || submission.contact_county) || submitBlock) {
      setSubmitError(
        submitBlock === "zip"
          ? "That ZIP code is outside Mecklenburg County. We can only help colonies in Mecklenburg County at this time."
          : "We can only help colonies in Mecklenburg County at this time."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/help-requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      const result = await response.json().catch(() => null);

      if (response.ok && result?.caseNumber) {
        setCaseNumber(result.caseNumber);
        setSubmitted(true);
      } else {
        setSubmitError(result?.error ?? "Unable to submit request. Please try again.");
      }
    } catch {
      setSubmitError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-5">
            <CheckCircle className="mx-auto h-16 w-16 text-primary" />
            <div className="space-y-1">
              <h2 className="text-xl font-semibold sm:text-2xl">Request Submitted</h2>
              <p className="text-muted-foreground">
                Thank you. Our team will review your report and contact you soon.
              </p>
            </div>

            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Your case number
              </p>
              <p className="text-3xl font-bold tracking-wide text-foreground sm:text-4xl break-all">
                {caseNumber}
              </p>
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950 space-y-2">
              <p className="font-semibold">Please save this case number</p>
              <p className="leading-relaxed">
              Our volunteer team uses this case number to track your colony submission, so please reference it as volunteers work with you on this case.
              </p>
            </div>

            <Button type="button" variant="outline" asChild className="w-full">
              <Link href="/update-case">Update colony progress later</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/login" className="mb-4 inline-flex justify-center text-primary">
            <BrandMark nameClassName="text-xl text-primary" />
          </Link>
          <h1 className="text-xl font-bold sm:text-2xl">Report a Cat Colony in Mecklenburg County</h1>
          <p className="text-muted-foreground mt-1">
            We currently serve colonies in Mecklenburg County, NC. Your report goes to our team of volunteers.
          </p>
          <div className="mx-auto mt-5 max-w-md rounded-lg border border-primary/25 bg-primary/5 px-4 py-3.5 text-center">
            <p className="text-sm font-medium text-foreground">Already reported a colony?</p>
            <Button type="button" asChild className="mt-2.5 w-full sm:w-auto">
              <Link href="/update-case">Update your case progress</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {STEPS.map((entry, i) => (
            <div
              key={entry.label}
              className={`text-xs px-2 py-1 rounded-full border ${
                i === step
                  ? entry.category === "colony"
                    ? "bg-amber-600 text-white border-amber-600"
                    : entry.category === "reporter"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-primary text-white border-primary"
                  : i < step
                    ? entry.category === "colony"
                      ? "bg-amber-100 text-amber-900 border-amber-200"
                      : entry.category === "reporter"
                        ? "bg-blue-100 text-blue-900 border-blue-200"
                        : "bg-primary/20 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground border-transparent"
              }`}
            >
              {entry.label}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {serviceAreaBlock && <OutOfServiceAreaNotice reason={serviceAreaBlock} />}

            {STEPS[step].category !== "review" &&
              STEPS[step].category !== "intro" && (
                <FormSectionBanner
                  variant={STEPS[step].category}
                  title={
                    STEPS[step].category === "reporter"
                      ? "Questions about you"
                      : "Questions about the colony"
                  }
                  description={STEPS[step].description}
                />
              )}

            {step === 0 && <AboutUsStep message={aboutMessage} donateUrl={donateUrl} donateText={donateText} />}

            {step === 1 && (
              <>
                <CountySelect
                  label="County where the colony is located"
                  value={serviceCounty}
                  onChange={setServiceCounty}
                  required
                />
                {!serviceCounty.trim() && (
                  <p className="text-sm text-muted-foreground">
                    Select Mecklenburg County to continue with this form.
                  </p>
                )}

                <fieldset disabled={remainderLocked} className="space-y-4 disabled:opacity-60">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Your first name</Label>
                      <Input
                        value={form.contact_first_name}
                        onChange={(e) => update("contact_first_name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Your last name</Label>
                      <Input
                        value={form.contact_last_name}
                        onChange={(e) => update("contact_last_name", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <AddressAutocomplete
                    label="Your home street address"
                    defaultValue={form.contact_street}
                    required
                    onAddressChange={(address) => update("contact_street", address)}
                    onSelect={(parts) => {
                      update("contact_street", parts.address);
                      update("contact_city", parts.city);
                      update("contact_state", parts.state);
                      update("contact_zip", parts.zip);
                      const resolved = resolveCountyFromAutocomplete(parts.county, parts.state);
                      if (resolved) {
                        update("contact_county", resolved);
                        if (colonySameAsHome) {
                          update("colony_county", resolved);
                        }
                      }
                    }}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Your city</Label>
                      <Input
                        value={form.contact_city}
                        onChange={(e) => update("contact_city", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Your state</Label>
                      <Input
                        value={form.contact_state}
                        onChange={(e) => update("contact_state", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Your ZIP code</Label>
                    <Input
                      value={form.contact_zip}
                      onChange={(e) => update("contact_zip", e.target.value)}
                      inputMode="numeric"
                      autoComplete="postal-code"
                    />
                    {serviceAreaBlock === "zip" && (
                      <p className="text-sm text-amber-900">
                        Edit the ZIP above if this was a typo — the form will unlock once it matches
                        Mecklenburg County.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Your email</Label>
                    <Input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => update("contact_email", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Your phone number</Label>
                    <Input
                      type="tel"
                      value={form.contact_phone}
                      onChange={(e) => update("contact_phone", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Your relationship to the cats</Label>
                    <Input
                      value={form.relationship_to_cats}
                      onChange={(e) => handleRelationshipChange(e.target.value)}
                      placeholder="e.g. Feeder, property owner, neighbor"
                    />
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                    <Checkbox
                      id="colony_same_as_home"
                      checked={colonySameAsHome}
                      onCheckedChange={(checked) => setColonySameAsHomeChecked(!!checked)}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="colony_same_as_home" className="font-normal leading-snug">
                        The cat colony is at this same address
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Check this if you don&apos;t need to enter a separate colony location later.
                      </p>
                    </div>
                  </div>
                </fieldset>
              </>
            )}

            {step === 2 && (
              <fieldset disabled={remainderLocked} className="space-y-4 disabled:opacity-60">
                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <Checkbox
                    id="colony_same_as_home_step1"
                    checked={colonySameAsHome}
                    onCheckedChange={(checked) => setColonySameAsHomeChecked(!!checked)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="colony_same_as_home_step1" className="font-normal leading-snug">
                      The cat colony is at my home address
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      We&apos;ll use the address you entered on the previous step.
                    </p>
                  </div>
                </div>

                {colonySameAsHome && (
                  <>
                    {homeAddressComplete(form) ? (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                        <p className="font-medium">Colony location</p>
                        <p>
                          {formatHomeAddress(form)}
                          {form.contact_county ? ` (${form.contact_county} County)` : ""}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 rounded-md border border-dashed p-4">
                        <p className="text-sm text-muted-foreground">
                          Please complete your home address on the previous step, or uncheck the box
                          above to enter a separate colony location.
                        </p>
                        <AddressAutocomplete
                          label="Your home street address"
                          defaultValue={form.contact_street}
                          required
                          onAddressChange={(address) => update("contact_street", address)}
                          onSelect={(parts) => {
                            update("contact_street", parts.address);
                            update("contact_city", parts.city);
                            update("contact_state", parts.state);
                            update("contact_zip", parts.zip);
                            const resolved = resolveCountyFromAutocomplete(parts.county, parts.state);
                            if (resolved) {
                              update("contact_county", resolved);
                              update("colony_county", resolved);
                            }
                          }}
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Your city</Label>
                            <Input
                              value={form.contact_city}
                              onChange={(e) => update("contact_city", e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Your state</Label>
                            <Input
                              value={form.contact_state}
                              onChange={(e) => update("contact_state", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Your ZIP code</Label>
                          <Input
                            value={form.contact_zip}
                            onChange={(e) => update("contact_zip", e.target.value)}
                            required
                            inputMode="numeric"
                            autoComplete="postal-code"
                          />
                          {serviceAreaBlock === "zip" && (
                            <p className="text-sm text-amber-900">
                              Edit the ZIP above if this was a typo — the form will unlock once it
                              matches Mecklenburg County.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!colonySameAsHome && (
                  <>
                    <AddressAutocomplete
                      label="Colony address"
                      defaultValue={form.colony_address}
                      required
                      onAddressChange={(address) => update("colony_address", address)}
                      onSelect={(parts) => {
                        update("colony_address", parts.address);
                        update("colony_city", parts.city);
                        update("colony_state", parts.state);
                        const resolved = resolveCountyFromAutocomplete(parts.county, parts.state);
                        if (resolved) update("colony_county", resolved);
                        update("colony_zip", parts.zip);
                        if (parts.lat) update("colony_lat", parts.lat);
                        if (parts.lng) update("colony_lng", parts.lng);
                      }}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Colony City</Label>
                        <Input
                          value={form.colony_city}
                          onChange={(e) => update("colony_city", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Colony State</Label>
                        <Input
                          value={form.colony_state}
                          onChange={(e) => update("colony_state", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Colony ZIP Code</Label>
                        <Input
                          value={form.colony_zip}
                          onChange={(e) => update("colony_zip", e.target.value)}
                          required
                          inputMode="numeric"
                          autoComplete="postal-code"
                        />
                        {serviceAreaBlock === "zip" && (
                          <p className="text-sm text-amber-900">
                            Edit the ZIP above if this was a typo — the form will unlock once it
                            matches Mecklenburg County.
                          </p>
                        )}
                      </div>
                      <CountySelect
                        label="Colony county"
                        value={form.colony_county}
                        onChange={setServiceCounty}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Apartment community name (if applicable)</Label>
                  <Input
                    value={form.apartment_name}
                    onChange={(e) => update("apartment_name", e.target.value)}
                  />
                </div>
              </fieldset>
            )}

            {step === 3 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Cats over 8 weeks</Label>
                    <NumberInput
                      integer
                      min={0}
                      value={form.cats_over_8_weeks}
                      onValueChange={(value) => {
                        if (typeof value === "number") update("cats_over_8_weeks", value);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kittens under 8 weeks</Label>
                    <NumberInput
                      integer
                      min={0}
                      value={form.kittens_under_8_weeks}
                      onValueChange={(value) => {
                        if (typeof value === "number") update("kittens_under_8_weeks", value);
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Number you suspect are pregnant</Label>
                  <NumberInput
                    integer
                    min={0}
                    value={form.pregnant_count}
                    onValueChange={(value) => {
                      if (typeof value === "number") update("pregnant_count", value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Are you feeding the cats?</Label>
                  <YesNoSelect
                    id="feeding_cats"
                    value={form.feeding_cats}
                    onChange={handleFeedingCatsChange}
                  />
                </div>
                {showFeederPreview && feederPreview && (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                    <p className="font-medium">Colony feeder</p>
                    <p className="text-muted-foreground">
                      We&apos;ll save this from your contact info — no need to enter it again.
                    </p>
                    <p>{feederPreview.feeder_name}</p>
                    <p>
                      {[feederPreview.feeder_phone, feederPreview.feeder_email]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p>
                      {[
                        feederPreview.feeder_street,
                        feederPreview.feeder_city,
                        feederPreview.feeder_state,
                        feederPreview.feeder_zip,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      {feederPreview.feeder_county ? ` (${feederPreview.feeder_county} County)` : ""}
                    </p>
                  </div>
                )}
                {form.feeding_cats === "No" && (
                  <div className="space-y-2">
                    <Label>If you are not feeding, who is?</Label>
                    <Input
                      value={form.feeder_if_not}
                      onChange={(e) => update("feeder_if_not", e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Anything else you would like us to know about this colony?</Label>
                  <Textarea
                    value={form.intake_notes}
                    onChange={(e) => update("intake_notes", e.target.value)}
                    rows={4}
                    placeholder="Injuries, medical concerns, access issues, timing..."
                  />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="space-y-2">
                  <Label>Do you have trapping experience?</Label>
                  <YesNoSelect
                    id="trapping_experience"
                    value={form.trapping_experience}
                    onChange={(value) => update("trapping_experience", value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Do you need to borrow traps?</Label>
                  <YesNoSelect
                    id="need_traps"
                    value={form.need_traps}
                    onChange={(value) => update("need_traps", value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Are you willing to trap and transport?</Label>
                  <YesNoSelect
                    id="willing_to_trap_transport"
                    value={form.willing_to_trap_transport}
                    onChange={(value) => update("willing_to_trap_transport", value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Are you able to trap and transport?</Label>
                  <YesNoSelect
                    id="able_to_trap_transport"
                    value={form.able_to_trap_transport}
                    onChange={(value) => update("able_to_trap_transport", value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Do you have a place to hold cats before and after surgery?</Label>
                  <YesNoSelect
                    id="has_recovery_space"
                    value={form.has_recovery_space}
                    onChange={(value) => update("has_recovery_space", value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>How did you hear about us?</Label>
                  <Input
                    value={form.how_heard}
                    onChange={(e) => update("how_heard", e.target.value)}
                  />
                </div>
              </>
            )}

            {step === 5 && (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                  <p className="font-semibold text-blue-950 flex items-center gap-2">
                    <User className="h-4 w-4" aria-hidden />
                    About you
                  </p>
                  <p>
                    {form.contact_first_name} {form.contact_last_name} — {form.contact_email} —{" "}
                    {form.contact_phone}
                  </p>
                  {form.relationship_to_cats && (
                    <p>
                      <span className="text-muted-foreground">Relationship to cats:</span>{" "}
                      {form.relationship_to_cats}
                    </p>
                  )}
                  {form.how_heard && (
                    <p>
                      <span className="text-muted-foreground">How you heard about us:</span>{" "}
                      {form.how_heard}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                  <p className="font-semibold text-amber-950 flex items-center gap-2">
                    <Cat className="h-4 w-4" aria-hidden />
                    About the colony
                  </p>
                  <p>
                    {form.colony_address}, {form.colony_city}, {form.colony_state} {form.colony_zip}{" "}
                    ({form.colony_county})
                  </p>
                  <p>
                    {form.cats_over_8_weeks} cats over 8 weeks, {form.kittens_under_8_weeks} kittens
                    under 8 weeks, {form.pregnant_count} suspected pregnant
                  </p>
                  {form.feeding_cats && (
                    <p>
                      <span className="text-muted-foreground">Feeding cats:</span> {form.feeding_cats}
                      {form.feeding_cats === "No" && form.feeder_if_not
                        ? ` — feeder: ${form.feeder_if_not}`
                        : ""}
                    </p>
                  )}
                  {form.intake_notes && (
                    <p>
                      <span className="text-muted-foreground">Colony notes:</span> {form.intake_notes}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border p-4 space-y-1">
                  <p className="font-semibold">Your help with trapping</p>
                  <p className="text-muted-foreground">
                    Experience: {form.trapping_experience || "—"} · Need traps: {form.need_traps || "—"}{" "}
                    · Willing to trap/transport: {form.willing_to_trap_transport || "—"} · Able to
                    trap/transport: {form.able_to_trap_transport || "—"} · Recovery space:{" "}
                    {form.has_recovery_space || "—"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={goToNextStep} disabled={!canAdvanceFromStep(step)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={submitting || !formUnlocked}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              )}
            </div>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
