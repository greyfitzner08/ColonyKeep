"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isIntakeQueueStatus } from "@/lib/cases/statuses";
import type { HelpRequestStatus, UserRole } from "@/lib/types";
import { ArrowRight } from "lucide-react";

interface CaseRouteToTrapActionProps {
  helpRequestId: string;
  status: HelpRequestStatus;
  colonyZip: string | null;
  userRole: UserRole | null;
}

export function CaseRouteToTrapAction({
  helpRequestId,
  status,
  colonyZip,
  userRole,
}: CaseRouteToTrapActionProps) {
  const router = useRouter();
  const [routing, setRouting] = useState(false);
  const canRoute = userRole === "admin" || userRole === "inquiry_team";
  const showButton = canRoute && isIntakeQueueStatus(status);

  if (!showButton) {
    return null;
  }

  async function routeToTrap() {
    setRouting(true);
    const response = await fetch("/api/help-requests/route-to-trap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpRequestId }),
    });
    const result = await response.json().catch(() => null);
    setRouting(false);

    if (!response.ok) {
      alert(result?.error ?? "Could not route case to trap team");
      return;
    }

    router.refresh();
  }

  const zipHint = colonyZip || "—";

  return (
    <Button
      size="sm"
      onClick={routeToTrap}
      disabled={routing}
      title={`Sends this case to the trap queue and assigns a team from colony ZIP ${zipHint}.`}
    >
      <ArrowRight className="h-4 w-4 mr-2" />
      {routing ? "Routing…" : "Route to trap team"}
    </Button>
  );
}
