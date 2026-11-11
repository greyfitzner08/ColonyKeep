"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HelpRequest } from "@/lib/types";

interface NeedsClinicDateActionsProps {
  helpRequest: Pick<HelpRequest, "id" | "needs_clinic_date">;
  compact?: boolean;
}

export function NeedsClinicDateActions({
  helpRequest,
  compact = false,
}: NeedsClinicDateActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const active = Boolean(helpRequest.needs_clinic_date);

  async function setNeeded(needed: boolean) {
    setLoading(true);
    const response = await fetch("/api/help-requests/needs-clinic-date", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpRequestId: helpRequest.id, needed }),
    });
    setLoading(false);
    if (response.ok) {
      router.refresh();
    }
  }

  if (compact) {
    return (
      <Button
        size="sm"
        variant={active ? "outline" : "secondary"}
        disabled={loading}
        onClick={() => void setNeeded(!active)}
      >
        <CalendarClock className="mr-1 h-3.5 w-3.5" />
        {loading
          ? "Saving…"
          : active
            ? "Clear clinic date need"
            : "Needs clinic date"}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="h-4 w-4" />
        Clinic date
      </div>
      <p className="text-sm text-muted-foreground">
        {active
          ? "This case is flagged as needing a clinic appointment date."
          : "Flag this case when cats are ready but no clinic date is scheduled yet."}
      </p>
      <Button
        size="sm"
        variant={active ? "outline" : "default"}
        disabled={loading}
        onClick={() => void setNeeded(!active)}
      >
        {loading
          ? "Saving…"
          : active
            ? "Clear Needs Clinic Date"
            : "Mark Needs Clinic Date"}
      </Button>
    </div>
  );
}
