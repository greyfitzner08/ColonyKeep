"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_COLORS } from "@/lib/constants";
import { hasActiveMedicalFlag } from "@/lib/medical-flags";
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

interface IntakeCaseTableProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
}

export function IntakeCaseTable({ cases, canClaim, userEmail }: IntakeCaseTableProps) {
  const router = useRouter();

  async function claimCase(caseId: string) {
    const response = await fetch("/api/help-requests/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpRequestId: caseId }),
    });

    if (response.ok) {
      router.refresh();
    }
  }

  if (cases.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No cases match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Case #</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Cats</th>
            <th className="px-4 py-3 font-medium">Team</th>
            <th className="px-4 py-3 font-medium">Working</th>
            <th className="px-4 py-3 font-medium">Submitted</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((helpRequest) => {
            const medical = hasActiveMedicalFlag(
              helpRequest.medical_flags ?? [],
              helpRequest.medical_flag_dismissed,
              helpRequest.medical_flag_forced
            );
            const totalCats =
              helpRequest.kittens_under_8_weeks + helpRequest.cats_over_8_weeks;
            const isMine = helpRequest.claimed_by_email === userEmail;
            const isUnclaimed = !helpRequest.claimed_by_email;
            const worker =
              helpRequest.claimed_by_name ??
              helpRequest.claimed_by_email ??
              helpRequest.assigned_to ??
              "—";

            return (
              <tr key={helpRequest.id} className="border-t align-top hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/case/${helpRequest.id}`} className="font-medium text-primary hover:underline">
                      {helpRequest.case_number}
                    </Link>
                    {medical && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        Medical
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn("text-xs", STATUS_COLORS[helpRequest.status])}>
                    {helpRequest.status.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {helpRequest.colony_city}, {helpRequest.colony_county} {helpRequest.colony_zip}
                </td>
                <td className="px-4 py-3">{totalCats}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {helpRequest.assigned_team_name ?? "—"}
                </td>
                <td className="px-4 py-3">{worker}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDateTime(helpRequest.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/case/${helpRequest.id}`}>Open</Link>
                    </Button>
                    {canClaim && isUnclaimed && (
                      <Button size="sm" variant="secondary" onClick={() => claimCase(helpRequest.id)}>
                        Claim
                      </Button>
                    )}
                    {helpRequest.claimed_by_email && !isMine && (
                      <span className="text-xs text-muted-foreground self-center">Assigned</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
