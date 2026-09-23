"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PublicProgressSummary } from "@/lib/cases/public-progress-update";

type Step = "verify" | "update" | "done";

export function PublicCaseProgressForm() {
  const [step, setStep] = useState<Step>("verify");
  const [caseNumber, setCaseNumber] = useState("");
  const [colonyZip, setColonyZip] = useState("");
  const [colonyStreet, setColonyStreet] = useState("");
  const [summary, setSummary] = useState<PublicProgressSummary | null>(null);
  const [tnvrAdults, setTnvrAdults] = useState(0);
  const [tnvrKittens, setTnvrKittens] = useState(0);
  const [acc, setAcc] = useState(0);
  const [foster, setFoster] = useState(0);
  const [other, setOther] = useState(0);
  const [yourName, setYourName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verifyCase(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/public/case-progress/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_number: caseNumber,
          colony_zip: colonyZip,
          colony_street: colonyStreet,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(getApiErrorMessage(result, "Unable to verify that case."));
        return;
      }
      setSummary(result.case as PublicProgressSummary);
      setStep("update");
    } catch {
      setError("Unable to verify that case.");
    } finally {
      setBusy(false);
    }
  }

  async function submitUpdate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/public/case-progress/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_number: caseNumber,
          colony_zip: colonyZip,
          colony_street: colonyStreet,
          tnvr_adults: tnvrAdults,
          tnvr_kittens: tnvrKittens,
          acc,
          foster,
          other,
          your_name: yourName,
          notes,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(getApiErrorMessage(result, "Unable to save your update."));
        return;
      }
      setSummary(result.case as PublicProgressSummary);
      setStep("done");
    } catch {
      setError("Unable to save your update.");
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setStep("verify");
    setSummary(null);
    setTnvrAdults(0);
    setTnvrKittens(0);
    setAcc(0);
    setFoster(0);
    setOther(0);
    setNotes("");
    setError(null);
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <Link href="/login" className="mb-4 inline-flex justify-center text-primary">
            <BrandMark nameClassName="text-xl text-primary" />
          </Link>
          <h1 className="text-xl font-bold sm:text-2xl">Update colony progress</h1>
          <p className="mt-1 text-muted-foreground">
            Verify your case with the case number and colony location, then tell us how many cats
            have been TNR’d or otherwise removed. No account needed.
          </p>
        </div>

        {step === "done" && summary ? (
          <Card className="text-center">
            <CardContent className="space-y-5 pb-6 pt-8">
              <CheckCircle className="mx-auto h-16 w-16 text-primary" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Update saved</h2>
                <p className="text-muted-foreground">
                  Thanks — your colony counts for {summary.caseNumber} were updated.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-left text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Remaining cats:</span>{" "}
                  <span className="font-medium">{summary.remainingTotal}</span>
                  {summary.remainingTotal > 0 ? (
                    <span className="text-muted-foreground">
                      {" "}
                      ({summary.remainingAdults} over 8 weeks, {summary.remainingKittens} kittens)
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground">
                  Recorded outcomes — TNR {summary.outcomeTnvr}, ACC {summary.outcomeAcc}, foster{" "}
                  {summary.outcomeFoster}, other {summary.outcomeOther}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" onClick={startOver}>
                  Update another case
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/request">Report a new colony</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "verify" ? (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <form onSubmit={(event) => void verifyCase(event)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="case-number">Case number</Label>
                  <Input
                    id="case-number"
                    value={caseNumber}
                    onChange={(event) => setCaseNumber(event.target.value)}
                    placeholder="CASE-00012"
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colony-zip">Colony ZIP code</Label>
                  <Input
                    id="colony-zip"
                    value={colonyZip}
                    onChange={(event) => setColonyZip(event.target.value)}
                    placeholder="28205"
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colony-street">Colony street (optional if ZIP matches)</Label>
                  <Input
                    id="colony-street"
                    value={colonyStreet}
                    onChange={(event) => setColonyStreet(event.target.value)}
                    placeholder="Part of the street name from your report"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide ZIP and/or at least 4 characters of the colony street so we can verify
                    it’s your case. We won’t show contact details or the full address.
                  </p>
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    "Verify case"
                  )}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                Need to report a new colony?{" "}
                <Link href="/request" className="text-primary underline-offset-2 hover:underline">
                  Start a new request
                </Link>
              </p>
            </CardContent>
          </Card>
        ) : null}

        {step === "update" && summary ? (
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-1">
                <p className="font-medium">{summary.caseNumber}</p>
                <p className="text-muted-foreground">
                  Status: {summary.statusLabel}
                  {summary.colonyCity ? ` · Colony in ${summary.colonyCity}` : ""}
                </p>
                <p>
                  Remaining:{" "}
                  <span className="font-medium">{summary.remainingTotal}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    ({summary.remainingAdults} over 8 weeks, {summary.remainingKittens} kittens)
                  </span>
                </p>
              </div>

              <form onSubmit={(event) => void submitUpdate(event)} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter how many cats were handled <span className="font-medium">since your last update</span>
                  . These amounts are subtracted from the remaining count.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tnvr-adults">TNR’d (over 8 weeks)</Label>
                    <NumberInput
                      id="tnvr-adults"
                      integer
                      value={tnvrAdults}
                      min={0}
                      max={summary.remainingAdults}
                      onValueChange={(value) => {
                        if (typeof value === "number") setTnvrAdults(value);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tnvr-kittens">TNR’d (kittens under 8 weeks)</Label>
                    <NumberInput
                      id="tnvr-kittens"
                      integer
                      value={tnvrKittens}
                      min={0}
                      max={summary.remainingKittens}
                      onValueChange={(value) => {
                        if (typeof value === "number") setTnvrKittens(value);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acc">Taken to ACC</Label>
                    <NumberInput
                      id="acc"
                      integer
                      value={acc}
                      min={0}
                      onValueChange={(value) => {
                        if (typeof value === "number") setAcc(value);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="foster">Taken into foster</Label>
                    <NumberInput
                      id="foster"
                      integer
                      value={foster}
                      min={0}
                      onValueChange={(value) => {
                        if (typeof value === "number") setFoster(value);
                      }}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="other">Other outcome (rehomed, moved, etc.)</Label>
                    <NumberInput
                      id="other"
                      integer
                      value={other}
                      min={0}
                      onValueChange={(value) => {
                        if (typeof value === "number") setOther(value);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="your-name">Your name (optional)</Label>
                  <Input
                    id="your-name"
                    value={yourName}
                    onChange={(event) => setYourName(event.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes for the team (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Anything else volunteers should know…"
                  />
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={startOver} disabled={busy}>
                    Back
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save update"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
