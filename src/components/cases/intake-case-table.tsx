"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { STATUS_COLORS } from "@/lib/constants";
import { hasActiveMedicalFlag } from "@/lib/medical-flags";
import { formatDateTime } from "@/lib/utils";
import { postCaseClaim } from "@/lib/cases/case-claim-api";
import type { HelpRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

interface IntakeCaseTableProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
  isAdmin?: boolean;
}

export function IntakeCaseTable({
  cases,
  canClaim,
  userEmail,
  isAdmin = false,
}: IntakeCaseTableProps) {
  const router = useRouter();

  async function mutateCaseClaim(caseId: string, action: "claim" | "unclaim") {
    const response = await postCaseClaim(caseId, action);
    if (response.ok) {
      router.refresh();
    }
  }

  const columns = useMemo((): DataTableColumn<HelpRequest>[] => {
    return [
      {
        id: "case_number",
        label: "Case #",
        defaultWidth: 180,
        minWidth: 130,
        render: (helpRequest) => {
          const medical = hasActiveMedicalFlag(
            helpRequest.medical_flags ?? [],
            helpRequest.medical_flag_dismissed,
            helpRequest.medical_flag_forced
          );
          return (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Link
                href={`/case/${helpRequest.id}`}
                className="shrink-0 font-medium text-primary hover:underline"
              >
                {helpRequest.case_number}
              </Link>
              {medical && (
                <Badge variant="destructive" className="gap-1 text-xs whitespace-nowrap">
                  <AlertTriangle className="h-3 w-3" />
                  Medical
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        label: "Status",
        defaultWidth: 170,
        minWidth: 110,
        render: (helpRequest) => (
          <Badge className={cn("max-w-full truncate text-xs", STATUS_COLORS[helpRequest.status])}>
            {helpRequest.status.replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        id: "location",
        label: "Location",
        defaultWidth: 180,
        render: (helpRequest) => (
          <span className="text-muted-foreground">
            {helpRequest.colony_city}, {helpRequest.colony_county} {helpRequest.colony_zip}
          </span>
        ),
      },
      {
        id: "cats",
        label: "Cats",
        defaultWidth: 72,
        minWidth: 56,
        render: (helpRequest) =>
          helpRequest.kittens_under_8_weeks + helpRequest.cats_over_8_weeks,
      },
      {
        id: "team",
        label: "Team",
        defaultWidth: 130,
        render: (helpRequest) => (
          <span className="text-muted-foreground">{helpRequest.assigned_team_name ?? "—"}</span>
        ),
      },
      {
        id: "working",
        label: "Working",
        defaultWidth: 150,
        render: (helpRequest) =>
          helpRequest.claimed_by_name ??
          helpRequest.claimed_by_email ??
          helpRequest.assigned_to ??
          "—",
      },
      {
        id: "submitted",
        label: "Submitted",
        defaultWidth: 160,
        render: (helpRequest) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDateTime(helpRequest.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        label: "Actions",
        defaultWidth: 180,
        minWidth: 120,
        render: (helpRequest) => {
          const isMine = helpRequest.claimed_by_email === userEmail;
          const isUnclaimed = !helpRequest.claimed_by_email;
          const canUnclaim =
            helpRequest.claimed_by_email && (isMine || isAdmin);
          return (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/case/${helpRequest.id}`}>Open</Link>
              </Button>
              {canClaim && isUnclaimed && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => mutateCaseClaim(helpRequest.id, "claim")}
                >
                  Claim
                </Button>
              )}
              {canUnclaim && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mutateCaseClaim(helpRequest.id, "unclaim")}
                >
                  {isMine ? "Unclaim" : "Release"}
                </Button>
              )}
              {helpRequest.claimed_by_email && !isMine && !canUnclaim && (
                <span className="self-center text-xs text-muted-foreground">Assigned</span>
              )}
            </div>
          );
        },
      },
    ];
  }, [canClaim, userEmail, isAdmin]);

  return (
    <DataTable
      tableId="intake-cases"
      columns={columns}
      rows={cases}
      getRowKey={(helpRequest) => helpRequest.id}
      emptyMessage="No cases match your filters."
    />
  );
}
