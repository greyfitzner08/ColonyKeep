"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import { AboutUsStep } from "@/components/intake/about-us-step";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VaccinationList } from "@/components/adoption/vaccination-list";
import { VetCareDueList } from "@/components/adoption/vet-care-due-list";
import {
  emptyEntranceAnswers,
  entranceFieldLabel,
  entranceFieldSpansRow,
  entranceOptionLabel,
  applyEntranceAnswer,
  missingChangedName,
  parseVaccinationList,
  publicEntranceSections,
  vaccinationListError,
  type EntranceAnswers,
  type EntranceField,
} from "@/lib/adoption/entrance";
const invalidClass = "border-destructive focus-visible:ring-destructive";

export function FieldControl({
  field,
  value,
  invalid,
  onChange,
}: {
  field: EntranceField;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const id = `entrance-${field.key}`;
  if (field.kind === "vaccinations") {
    return <VaccinationList id={id} value={value} invalid={invalid} onChange={onChange} />;
  }
  if (field.kind === "vet_care") {
    return <VetCareDueList id={id} value={value} invalid={invalid} onChange={onChange} />;
  }
  if (field.kind === "textarea") {
    return (
      <Textarea
        id={id}
        value={value}
        rows={3}
        aria-invalid={invalid}
        className={invalid ? invalidClass : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (field.kind === "yesno" || field.kind === "select") {
    return (
      <Select value={value || "unset"} onValueChange={(next) => onChange(next === "unset" ? "" : next)}>
        <SelectTrigger id={id} aria-invalid={invalid} className={invalid ? invalidClass : undefined}>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unset">Select...</SelectItem>
          {(field.options ?? [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      id={id}
      type={field.kind === "date" ? "date" : "text"}
      value={value}
      required={field.required}
      aria-invalid={invalid}
      className={invalid ? invalidClass : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function EntranceApplicationForm({
  aboutMessage,
  buttonUrl,
  buttonText,
}: {
  aboutMessage: string;
  buttonUrl: string | null;
  buttonText: string;
}) {
  const sections = publicEntranceSections();
  const steps = [
    { id: "about", title: "About us" },
    ...sections.map((section) => ({ id: section.id, title: section.title })),
    { id: "review", title: "Review" },
  ];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<EntranceAnswers>(emptyEntranceAnswers);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const firstStep = useRef(true);

  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    topRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [step]);

  function update(key: string, value: string) {
    setAnswers((current) => applyEntranceAnswer(current, key, value));
    if (key === "cat_name" || key === "name_changed" || key === "new_name") setError(null);
  }

  function goNext() {
    if (steps[step]?.id === "profile" && !answers.cat_name.trim()) {
      setError("Enter the cat’s name.");
      return;
    }
    if (steps[step]?.id === "profile" && missingChangedName(answers)) {
      setError("Enter the new name.");
      return;
    }
    if (steps[step]?.id === "veterinary") {
      const vaccinationError = vaccinationListError(parseVaccinationList(answers.vaccinations ?? ""));
      if (vaccinationError) {
        setError(vaccinationError);
        return;
      }
    }
    setError(null);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function handleSubmit() {
    setError(null);
    if (!answers.cat_name.trim()) {
      setError("Enter the cat’s name.");
      const profileStep = steps.findIndex((entry) => entry.id === "profile");
      if (profileStep >= 0) setStep(profileStep);
      return;
    }
    if (missingChangedName(answers)) {
      setError("Enter the new name.");
      const profileStep = steps.findIndex((entry) => entry.id === "profile");
      if (profileStep >= 0) setStep(profileStep);
      return;
    }
    const vaccinationError = vaccinationListError(parseVaccinationList(answers.vaccinations ?? ""));
    if (vaccinationError) {
      setError(vaccinationError);
      const veterinaryStep = steps.findIndex((entry) => entry.id === "veterinary");
      if (veterinaryStep >= 0) setStep(veterinaryStep);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/adoption/entrance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to submit this application. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="space-y-4 pb-6 pt-8">
            <CheckCircle className="mx-auto h-16 w-16 text-primary" />
            <h1 className="text-2xl font-semibold">Application submitted</h1>
            <p className="text-muted-foreground">
              Thank you. An adoption specialist will review {answers.cat_name.trim()}. Approving
              this cat adds them to Adoptable Cats.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nameMissing = error === "Enter the cat’s name.";
  const changedNameMissing = error === "Enter the new name.";

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div ref={topRef} className="mx-auto max-w-3xl scroll-mt-4 space-y-6">
        <div className="text-center">
          <Link href="/login" className="mb-4 inline-flex justify-center text-primary">
            <BrandMark nameClassName="text-xl text-primary" />
          </Link>
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
            Cat joining the program
          </p>
          <h1 className="text-xl font-bold sm:text-2xl">Rescue application</h1>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
            Submit a cat to join the adoption program. Approved cats are added to Adoptable Cats.
            This is not the form for a person who wants to adopt a cat.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {steps.map((entry, index) => (
            <div
              key={entry.id}
              className={`rounded-full border px-2 py-1 text-xs ${
                index === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : index < step
                    ? "border-primary/20 bg-primary/20 text-primary"
                    : "border-transparent bg-muted text-muted-foreground"
              }`}
            >
              {entry.title}
            </div>
          ))}
        </div>

        {steps[step]?.id === "about" && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <AboutUsStep
                message={aboutMessage}
                donateUrl={buttonUrl}
                donateText={buttonText}
                allowLinks
                matchEditorSpacing
                communicationsNotice={false}
                description="A few things to know before you submit a cat."
              />
              <div className="flex justify-end">
                <Button type="button" onClick={goNext}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {sections.map((section) =>
          steps[step]?.id === section.id ? (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {section.fields.map((field) => {
                  if (field.key === "new_name" && answers.name_changed !== "yes") return null;
                  return (
                  <div
                    key={field.key}
                    className={entranceFieldSpansRow(field) ? "space-y-2 sm:col-span-2" : "space-y-2"}
                  >
                    <Label htmlFor={`entrance-${field.key}`}>
                      {entranceFieldLabel(field, answers)}
                      {field.required || field.key === "new_name" ? " *" : ""}
                    </Label>
                    {field.key === "name_changed" ? (
                      <p className="text-sm text-muted-foreground">
                        If yes, list the new name. That name is required.
                      </p>
                    ) : null}
                    <FieldControl
                      field={field}
                      value={answers[field.key] ?? ""}
                      invalid={
                        (field.key === "cat_name" && nameMissing) ||
                        (field.key === "new_name" && changedNameMissing)
                      }
                      onChange={(value) => update(field.key, value)}
                    />
                    {field.key === "cat_name" && nameMissing && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    {field.key === "new_name" && changedNameMissing && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null
        )}

        {steps[step]?.id === "review" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {sections.map((section) => (
                <section key={section.id} className="space-y-2">
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {section.fields.map((field) => {
                      if (field.key === "new_name" && answers.name_changed !== "yes") return null;
                      return (
                      <div key={field.key} className={entranceFieldSpansRow(field) ? "sm:col-span-2" : undefined}>
                        <dt className="text-xs text-muted-foreground">{entranceFieldLabel(field, answers)}</dt>
                        <dd className="text-sm whitespace-pre-wrap">
                          {entranceOptionLabel(field.key, answers[field.key] ?? "")}
                        </dd>
                      </div>
                      );
                    })}
                  </dl>
                </section>
              ))}
            </CardContent>
          </Card>
        )}

        {steps[step]?.id !== "about" && (
          <>
            {error && !nameMissing && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                disabled={submitting}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              {steps[step]?.id === "review" ? (
                <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit cat"}
                </Button>
              ) : (
                <Button type="button" onClick={goNext}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
