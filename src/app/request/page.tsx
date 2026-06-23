"use client";

import { useState } from "react";
import { Cat, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import Link from "next/link";

const STEPS = ["Contact", "Location", "Colony Info", "Your Help", "Review"];

export default function RequestPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    colony_address: "",
    colony_city: "",
    colony_county: "",
    colony_zip: "",
    colony_lat: null as number | null,
    colony_lng: null as number | null,
    kittens_under_8_weeks: 0,
    cats_over_8_weeks: 0,
    can_help: false,
    has_traps: false,
    can_transport: false,
    has_recovery_space: false,
    consent_communications: false,
    intake_notes: "",
  });

  function update(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    const response = await fetch("/api/help-requests/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json().catch(() => null);

    setSubmitting(false);
    if (response.ok && result?.caseNumber) {
      setCaseNumber(result.caseNumber);
      setSubmitted(true);
    } else {
      setSubmitError(result?.error ?? "Unable to submit request");
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CheckCircle className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle>Request Submitted</CardTitle>
            <CardDescription>
              Your case number is <strong>{caseNumber}</strong>. Our team will review your report and contact you soon.
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
          <h1 className="text-2xl font-bold">Report a Cat Colony</h1>
          <p className="text-muted-foreground mt-1">Help us help community cats in your area</p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`text-xs px-2 py-1 rounded-full ${
                i === step ? "bg-primary text-white" : i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>Your Name</Label>
                  <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} required />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <AddressAutocomplete
                  onSelect={(parts) => {
                    update("colony_address", parts.address);
                    update("colony_city", parts.city);
                    update("colony_county", parts.county);
                    update("colony_zip", parts.zip);
                    if (parts.lat) update("colony_lat", parts.lat);
                    if (parts.lng) update("colony_lng", parts.lng);
                  }}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={form.colony_city} onChange={(e) => update("colony_city", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input value={form.colony_zip} onChange={(e) => update("colony_zip", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>County</Label>
                  <Input value={form.colony_county} onChange={(e) => update("colony_county", e.target.value)} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kittens (under 8 weeks)</Label>
                    <Input type="number" min={0} value={form.kittens_under_8_weeks} onChange={(e) => update("kittens_under_8_weeks", parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cats (over 8 weeks)</Label>
                    <Input type="number" min={0} value={form.cats_over_8_weeks} onChange={(e) => update("cats_over_8_weeks", parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={form.intake_notes}
                    onChange={(e) => update("intake_notes", e.target.value)}
                    placeholder="Describe the colony, any injuries or concerns..."
                    rows={4}
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <div className="space-y-4">
                {[
                  { key: "can_help", label: "I can help with trapping efforts" },
                  { key: "has_traps", label: "I have traps available" },
                  { key: "can_transport", label: "I can transport cats to/from clinic" },
                  { key: "has_recovery_space", label: "I have recovery space available" },
                  { key: "consent_communications", label: "I consent to receive communications about this case" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={form[key as keyof typeof form] as boolean}
                      onCheckedChange={(v) => update(key, !!v)}
                    />
                    <Label htmlFor={key}>{label}</Label>
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 text-sm">
                <p><strong>Contact:</strong> {form.contact_name} — {form.contact_email} — {form.contact_phone}</p>
                <p><strong>Location:</strong> {form.colony_address}, {form.colony_city}, {form.colony_county} {form.colony_zip}</p>
                <p><strong>Cats:</strong> {form.kittens_under_8_weeks} kittens, {form.cats_over_8_weeks} adults</p>
                {form.intake_notes && <p><strong>Notes:</strong> {form.intake_notes}</p>}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting || !form.consent_communications}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              )}
            </div>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
