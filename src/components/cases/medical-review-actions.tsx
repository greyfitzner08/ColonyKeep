"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { needsMedicalReview, hasActiveMedicalFlag } from "@/lib/medical-flags";
import type { HelpRequest } from "@/lib/types";

interface MedicalReviewActionsProps {
  helpRequest: HelpRequest;
  compact?: boolean;
}

export function MedicalReviewActions({ helpRequest, compact = false }: MedicalReviewActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"confirm" | "dismiss" | null>(null);

  const pending = needsMedicalReview(helpRequest);
  const active = hasActiveMedicalFlag(
    helpRequest.medical_flags ?? [],
    helpRequest.medical_flag_dismissed,
    helpRequest.medical_flag_forced
  );

  async function submit(decision: "confirm" | "dismiss") {
    setLoading(decision);
    const response = await fetch("/api/help-requests/medical-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpRequestId: helpRequest.id, decision }),
    });
    setLoading(null);
    if (response.ok) {
      router.refresh();
    }
  }

  if (pending) {
    return (
      <div className={compact ? "space-y-2" : "rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3"}>
        {!compact && (
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Medical review needed
          </div>
        )}
        {!compact && (
          <p className="text-sm text-muted-foreground">
            Intake notes flagged possible medical keywords. Confirm whether this is a medical case.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={loading != null}
            onClick={() => submit("confirm")}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {loading === "confirm" ? "Saving..." : "Confirm medical"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={loading != null}
            onClick={() => submit("dismiss")}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {loading === "dismiss" ? "Saving..." : "Not medical"}
          </Button>
        </div>
      </div>
    );
  }

  if (compact) return null;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-medium">Medical status</p>
      <p className="text-sm text-muted-foreground">
        {active
          ? "Marked as a medical case."
          : helpRequest.medical_flag_dismissed
            ? "Reviewed — not a medical case."
            : "No medical flags on this case."}
      </p>
      <div className="flex flex-wrap gap-2">
        {!active && (
          <Button size="sm" variant="destructive" disabled={loading != null} onClick={() => submit("confirm")}>
            Mark as medical
          </Button>
        )}
        {active && (
          <Button size="sm" variant="outline" disabled={loading != null} onClick={() => submit("dismiss")}>
            Mark as not medical
          </Button>
        )}
      </div>
    </div>
  );
}
