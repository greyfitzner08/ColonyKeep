"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ENTRANCE_SECTIONS,
  entranceOptionLabel,
  entranceReviewStatusLabel,
  type AdoptionEntranceApplication,
  type EntranceReviewStatus,
} from "@/lib/adoption/entrance";

function statusClass(status: EntranceReviewStatus): string {
  if (status === "approved") return "border-transparent bg-emerald-100 text-emerald-900";
  if (status === "denied") return "border-transparent bg-red-100 text-red-900";
  return "border-transparent bg-amber-100 text-amber-950";
}

export function EntranceReviewManager({
  applications,
}: {
  applications: AdoptionEntranceApplication[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(applications[0]?.id ?? null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(application: AdoptionEntranceApplication, decision: "approved" | "denied") {
    setError(null);
    const denialReason = reasons[application.id]?.trim() ?? "";
    if (decision === "denied" && !denialReason) {
      setError("Enter why this cat was declined so the decision is clear.");
      setOpenId(application.id);
      return;
    }
    setBusyId(application.id);
    try {
      const response = await fetch("/api/adoption/entrance/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: application.id,
          decision,
          denial_reason: denialReason,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to save this decision.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (applications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rescue applications yet. Share the public form to start receiving cats.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {applications.map((application) => {
        const open = openId === application.id;
        const pending = application.status === "pending";
        return (
          <Card key={application.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{application.cat_name}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Submitted {new Date(application.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusClass(application.status)}>
                  {entranceReviewStatusLabel(application.status)}
                </Badge>
                <Button type="button" size="sm" variant="outline" onClick={() => setOpenId(open ? null : application.id)}>
                  {open ? "Hide" : "Review"}
                </Button>
              </div>
            </CardHeader>
            {open && (
              <CardContent className="space-y-6">
                {ENTRANCE_SECTIONS.map((section) => (
                  <section key={section.id} className="space-y-2">
                    <h3 className="text-sm font-semibold">{section.title}</h3>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {section.fields.map((field) => (
                        <div key={field.key} className={field.kind === "textarea" ? "sm:col-span-2" : undefined}>
                          <dt className="text-xs text-muted-foreground">{field.label}</dt>
                          <dd className="text-sm whitespace-pre-wrap">
                            {entranceOptionLabel(field.key, application.answers?.[field.key] ?? "")}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
                {application.denial_reason && (
                  <p className="text-sm">
                    <span className="font-medium">Why declined: </span>
                    {application.denial_reason}
                  </p>
                )}
                {pending && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="space-y-2">
                      <Label htmlFor={`deny-${application.id}`}>Reason for declining</Label>
                      <Textarea
                        id={`deny-${application.id}`}
                        value={reasons[application.id] ?? ""}
                        rows={3}
                        placeholder="Required only if you decline this cat."
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [application.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={busyId === application.id}
                        onClick={() => void decide(application, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={busyId === application.id}
                        onClick={() => void decide(application, "denied")}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
