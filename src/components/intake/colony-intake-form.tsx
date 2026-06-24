"use client";

import { useState } from "react";
import Link from "next/link";
import { Cat, ChevronLeft, ChevronRight, CheckCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { NEWSLETTER_SIGNUP_DESCRIPTION, NEWSLETTER_SIGNUP_LABEL } from "@/lib/constants";
import { resolveCountyFromAutocomplete } from "@/lib/counties";
import type { CommunityIntakeSubmission } from "@/lib/cases/public-intake";

const STEPS = [
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

export function ColonyIntakeForm() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<CommunityIntakeSubmission>(EMPTY_FORM);
  const [colonyAtDifferentAddress, setColonyAtDifferentAddress] = useState("");

  function update<K extends keyof CommunityIntakeSubmission>(
    field: K,
    value: CommunityIntakeSubmission[K]
  ) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (colonyAtDifferentAddress === "No" && CONTACT_ADDRESS_FIELDS.has(field)) {
        return copyHomeAddressToColony(next);
      }
      return next;
    });
  }

  function handleColonyLocationAnswer(value: string) {
    setColonyAtDifferentAddress(value);
    if (value === "No") {
      setForm((prev) => copyHomeAddressToColony(prev));
    } else if (value === "Yes") {
      setForm((prev) => ({
        ...prev,
        colony_address: "",
        colony_city: "",
        colony_state: "",
        colony_county: "",
        colony_zip: "",
        colony_lat: null,
        colony_lng: null,
      }));
    }
  }

  function canAdvanceFromStep(currentStep: number) {
    if (currentStep === 0) {
      return Boolean(
        form.contact_first_name &&
          form.contact_last_name &&
          form.contact_email &&
          form.contact_phone
      );
    }
    if (currentStep === 1) {
      if (!colonyAtDifferentAddress) return false;
      if (colonyAtDifferentAddress === "No") {
        return homeAddressComplete(form);
      }
      return colonyAddressComplete(form);
    }
    return true;
  }

  function goToNextStep() {
    if (step === 1 && colonyAtDifferentAddress === "No") {
      setForm((prev) => copyHomeAddressToColony(prev));
    }
    setStep((current) => current + 1);
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);

    try {
      const submission =
        colonyAtDifferentAddress === "No" ? copyHomeAddressToColony(form) : form;
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
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-3">
            <CheckCircle className="mx-auto h-16 w-16 text-primary" />
            <h2 className="text-xl font-semibold">Request Submitted</h2>
            <p className="text-muted-foreground">
              Your case number is <strong>{caseNumber}</strong>. Our team will review your report
              and contact you soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/login" className="inline-flex items-center gap-2 text-primary mb-4">
            <Cat className="h-8 w-8" />
            <span className="text-xl font-semibold">TNVR Rescue</span>
          </Link>
          <h1 className="text-2xl font-bold">Report a Cat Colony</h1>
          <p className="text-muted-foreground mt-1">
            Community inquiry form — your report goes directly into our inquiry queue
          </p>
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
            {STEPS[step].category !== "review" && (
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

            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
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
                  onAddressChange={(address) => update("contact_street", address)}
                  onSelect={(parts) => {
                    update("contact_street", parts.address);
                    update("contact_city", parts.city);
                    update("contact_state", parts.state);
                    update("contact_zip", parts.zip);
                    update("contact_county", resolveCountyFromAutocomplete(parts.county, parts.state));
                  }}
                />
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Your ZIP code</Label>
                    <Input
                      value={form.contact_zip}
                      onChange={(e) => update("contact_zip", e.target.value)}
                    />
                  </div>
                  <CountySelect
                    label="Your county"
                    value={form.contact_county}
                    onChange={(county) => update("contact_county", county)}
                    required
                  />
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
                    onChange={(e) => update("relationship_to_cats", e.target.value)}
                    placeholder="e.g. Feeder, property owner, neighbor"
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Is the colony at a different address than your home?</Label>
                  <YesNoSelect
                    id="colony_at_different_address"
                    value={colonyAtDifferentAddress}
                    onChange={handleColonyLocationAnswer}
                  />
                </div>

                {colonyAtDifferentAddress === "No" && (
                  <>
                    {homeAddressComplete(form) ? (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                        <p className="font-medium">We&apos;ll use your home address for the colony:</p>
                        <p>
                          {form.contact_street}, {form.contact_city}, {form.contact_state}{" "}
                          {form.contact_zip} ({form.contact_county})
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 rounded-md border border-dashed p-4">
                        <p className="text-sm text-muted-foreground">
                          Please enter your home address — we&apos;ll use it as the colony location.
                        </p>
                        <div className="space-y-2">
                          <Label>Your home street address</Label>
                          <Input
                            value={form.contact_street}
                            onChange={(e) => update("contact_street", e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Your ZIP code</Label>
                            <Input
                              value={form.contact_zip}
                              onChange={(e) => update("contact_zip", e.target.value)}
                              required
                            />
                          </div>
                          <CountySelect
                            label="Your county"
                            value={form.contact_county}
                            onChange={(county) => update("contact_county", county)}
                            required
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {colonyAtDifferentAddress === "Yes" && (
                  <>
                    <AddressAutocomplete
                      label="Colony address"
                      defaultValue={form.colony_address}
                      onAddressChange={(address) => update("colony_address", address)}
                      onSelect={(parts) => {
                        update("colony_address", parts.address);
                        update("colony_city", parts.city);
                        update("colony_state", parts.state);
                        update("colony_county", resolveCountyFromAutocomplete(parts.county, parts.state));
                        update("colony_zip", parts.zip);
                        if (parts.lat) update("colony_lat", parts.lat);
                        if (parts.lng) update("colony_lng", parts.lng);
                      }}
                    />
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Colony ZIP Code</Label>
                        <Input
                          value={form.colony_zip}
                          onChange={(e) => update("colony_zip", e.target.value)}
                          required
                        />
                      </div>
                      <CountySelect
                        label="Colony county"
                        value={form.colony_county}
                        onChange={(county) => update("colony_county", county)}
                        required
                      />
                    </div>
                  </>
                )}

                {colonyAtDifferentAddress && (
                  <div className="space-y-2">
                    <Label>Apartment community name (if applicable)</Label>
                    <Input
                      value={form.apartment_name}
                      onChange={(e) => update("apartment_name", e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cats over 8 weeks</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.cats_over_8_weeks}
                      onChange={(e) =>
                        update("cats_over_8_weeks", Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kittens under 8 weeks</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.kittens_under_8_weeks}
                      onChange={(e) =>
                        update("kittens_under_8_weeks", Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Number you suspect are pregnant</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.pregnant_count}
                    onChange={(e) =>
                      update("pregnant_count", Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Are you feeding the cats?</Label>
                  <YesNoSelect
                    id="feeding_cats"
                    value={form.feeding_cats}
                    onChange={(value) => update("feeding_cats", value)}
                  />
                </div>
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

            {step === 3 && (
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
                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <Checkbox
                    id="consent_communications"
                    checked={form.consent_communications}
                    onCheckedChange={(v) => update("consent_communications", !!v)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="consent_communications">{NEWSLETTER_SIGNUP_LABEL}</Label>
                    <p className="text-sm text-muted-foreground">{NEWSLETTER_SIGNUP_DESCRIPTION}</p>
                  </div>
                </div>
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
                <Button type="button" onClick={handleSubmit} disabled={submitting}>
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
