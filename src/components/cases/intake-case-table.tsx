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
import { CaseFollowUpIndicator } from "@/components/cases/case-follow-up-indicator";
import { getStatusLabel } from "@/lib/cases/statuses";
import { formatDateTime } from "@/lib/utils";
import { postCaseClaim } from "@/lib/cases/case-claim-api";
import type { HelpRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

interface IntakeCaseTableProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
  isAdmin?: boolean;
  statusLabelContext?: "trap" | "default";
}

export function IntakeCaseTable({
  cases,
  canClaim,
  userEmail,
  isAdmin = false,
  statusLabelContext = "default",
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
        sortValue: (helpRequest) => helpRequest.case_number,
        render: (helpRequest) => {
          const medical = hasActiveMedicalFlag(
            helpRequest.medical_flags ?? [],
            helpRequest.medical_flag_dismissed,
            helpRequest.medical_flag_forced
          );
          return (
            <div className="flex items-center gap-1.5">
              <Link
                href={`/case/${helpRequest.id}`}
                className="font-medium text-primary hover:underline"
              >
                {helpRequest.case_number}
              </Link>
              <CaseFollowUpIndicator helpRequest={helpRequest} />
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
        sortValue: (helpRequest) => getStatusLabel(helpRequest.status, statusLabelContext),
        render: (helpRequest) => (
          <Badge className={cn("text-xs whitespace-nowrap", STATUS_COLORS[helpRequest.status])}>
            {getStatusLabel(helpRequest.status, statusLabelContext)}
          </Badge>
        ),
      },
      {
        id: "location",
        label: "Location",
        wrap: true,
        sortValue: (helpRequest) =>
          `${helpRequest.colony_city}, ${helpRequest.colony_county} ${helpRequest.colony_zip}`,
        render: (helpRequest) => (
          <span className="text-muted-foreground">
            {helpRequest.colony_city}, {helpRequest.colony_county} {helpRequest.colony_zip}
          </span>
        ),
      },
      {
        id: "cats",
        label: "Cats",
        sortValue: (helpRequest) =>
          helpRequest.kittens_under_8_weeks + helpRequest.cats_over_8_weeks,
        render: (helpRequest) =>
          helpRequest.kittens_under_8_weeks + helpRequest.cats_over_8_weeks,
      },
      {
        id: "team",
        label: "Team",
        sortValue: (helpRequest) => helpRequest.assigned_team_name ?? "",
        render: (helpRequest) => (
          <span className="text-muted-foreground">{helpRequest.assigned_team_name ?? "—"}</span>
        ),
      },
      {
        id: "working",
        label: "Working",
        wrap: true,
        sortValue: (helpRequest) =>
          helpRequest.claimed_by_name ??
          helpRequest.claimed_by_email ??
          helpRequest.assigned_to ??
          "",
        render: (helpRequest) =>
          helpRequest.claimed_by_name ??
          helpRequest.claimed_by_email ??
          helpRequest.assigned_to ??
          "—",
      },
      {
        id: "submitted",
        label: "Submitted",
        sortValue: (helpRequest) => helpRequest.created_at,
        render: (helpRequest) => (
          <span className="text-muted-foreground">{formatDateTime(helpRequest.created_at)}</span>
        ),
      },
      {
        id: "actions",
        label: "Actions",
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
  }, [canClaim, userEmail, isAdmin, statusLabelContext]);

  return (
    <DataTable
      tableId="intake-cases"
      columns={columns}
      rows={cases}
      getRowKey={(helpRequest) => helpRequest.id}
      emptyMessage="No cases match your filters."
      searchPlaceholder="Search cases…"
    />
  );
}
