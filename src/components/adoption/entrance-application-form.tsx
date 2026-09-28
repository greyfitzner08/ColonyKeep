"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
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
import {
  ENTRANCE_SECTIONS,
  emptyEntranceAnswers,
  type EntranceAnswers,
  type EntranceField,
} from "@/lib/adoption/entrance";

const invalidClass = "border-destructive focus-visible:ring-destructive";

function FieldControl({
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

export function EntranceApplicationForm() {
  const [answers, setAnswers] = useState<EntranceAnswers>(emptyEntranceAnswers);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update(key: string, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
    if (key === "cat_name") setError(null);
  }

  async function handleSubmit() {
    setError(null);
    if (!answers.cat_name.trim()) {
      setError("Enter the cat’s name.");
      document.getElementById("entrance-cat_name")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
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
              Thank you. An adoption specialist will review {answers.cat_name.trim()} and approve
              or decline entry into the adoption program.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nameMissing = error === "Enter the cat’s name.";

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <Link href="/login" className="mb-4 inline-flex justify-center text-primary">
            <BrandMark nameClassName="text-xl text-primary" />
          </Link>
          <h1 className="text-xl font-bold sm:text-2xl">Adoption Program Entrance Application</h1>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
            Use this form to submit a cat for the adoption program. An adoption specialist reviews
            each application and approves or declines entry.
          </p>
        </div>

        {ENTRANCE_SECTIONS.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div
                  key={field.key}
                  className={field.kind === "textarea" ? "space-y-2 sm:col-span-2" : "space-y-2"}
                >
                  <Label htmlFor={`entrance-${field.key}`}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </Label>
                  <FieldControl
                    field={field}
                    value={answers[field.key] ?? ""}
                    invalid={field.key === "cat_name" && nameMissing}
                    onChange={(value) => update(field.key, value)}
                  />
                  {field.key === "cat_name" && nameMissing && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {error && !nameMissing && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit application"}
          </Button>
        </div>
      </div>
    </div>
  );
}
