"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { HelpRequestStatus, UserRole } from "@/lib/types";
import { MessageCircleQuestion } from "lucide-react";

interface CaseNeedsMoreInfoActionProps {
  helpRequestId: string;
  status: HelpRequestStatus;
  userRole: UserRole | null;
}

export function CaseNeedsMoreInfoAction({
  helpRequestId,
  status,
  userRole,
}: CaseNeedsMoreInfoActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const canMark = userRole === "admin" || userRole === "trap_team_lead";
  const showButton =
    canMark &&
    (status === "routed_to_trap_team" ||
      status === "claimed" ||
      status === "new_intake" ||
      status === "under_review" ||
      status === "needs_more_info");

  if (!showButton) {
    return null;
  }

  async function markNeedsMoreInfo() {
    setLoading(true);
    const response = await fetch("/api/help-requests/needs-more-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpRequestId }),
    });
    const result = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      alert(result?.error ?? "Could not update case status");
      return;
    }

    router.refresh();
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={markNeedsMoreInfo}
      disabled={loading}
      title="Mark this case as waiting on more information from the reporter."
    >
      <MessageCircleQuestion className="h-4 w-4 mr-2" />
      {loading ? "Updating…" : "Needs more info"}
    </Button>
  );
}
