"use client";

import { useState } from "react";
import { AssignCaseDialog } from "@/components/cases/assign-case-dialog";
import { Button } from "@/components/ui/button";
import type { CaseAssigneeOption } from "@/lib/cases/case-assignees";

interface AssignCaseButtonProps {
  helpRequestId: string;
  caseNumber?: string | null;
  claimedByEmail?: string | null;
  assignedTeamId?: string | null;
  assignees: CaseAssigneeOption[];
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function AssignCaseButton({
  helpRequestId,
  caseNumber,
  claimedByEmail,
  assignedTeamId,
  assignees,
  size = "sm",
  className,
}: AssignCaseButtonProps) {
  const [open, setOpen] = useState(false);

  if (assignees.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        size={size}
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        {claimedByEmail ? "Reassign" : "Assign"}
      </Button>
      <AssignCaseDialog
        open={open}
        onOpenChange={setOpen}
        helpRequestId={helpRequestId}
        caseNumber={caseNumber}
        currentClaimedByEmail={claimedByEmail}
        assignees={assignees}
        preferredTeamId={assignedTeamId}
      />
    </>
  );
}
