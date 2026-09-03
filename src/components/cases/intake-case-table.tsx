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
import {
  getCaseLifecycleLabel,
  getStatusLabel,
  LIFECYCLE_STATUS_COLORS,
  toCaseLifecycleStatus,
} from "@/lib/cases/statuses";
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
  claimBeforeReview?: boolean;
}

export function IntakeCaseTable({
  cases,
  canClaim,
  userEmail,
  isAdmin = false,
  statusLabelContext = "default",
  claimBeforeReview = false,
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
          const isMine = helpRequest.claimed_by_email === userEmail;
          const lockOpen = claimBeforeReview && !helpRequest.claimed_by_email;
          return (
            <div className="flex items-center gap-1.5">
              {lockOpen ? (
                <span className="font-medium">{helpRequest.case_number}</span>
              ) : (
                <Link
                  href={`/case/${helpRequest.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {helpRequest.case_number}
                </Link>
              )}
              <CaseFollowUpIndicator helpRequest={helpRequest} />
              {medical && (
                <Badge variant="destructive" className="gap-1 text-xs whitespace-nowrap">
                  <AlertTriangle className="h-3 w-3" />
                  Medical
                </Badge>
              )}
              {claimBeforeReview && isMine && (
                <Badge variant="outline" className="text-xs">
                  Yours
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        label: "Status",
        sortValue: (helpRequest) =>
          statusLabelContext === "trap"
            ? getStatusLabel(helpRequest.status, "trap")
            : getCaseLifecycleLabel(helpRequest),
        render: (helpRequest) => {
          if (statusLabelContext === "trap") {
            return (
              <Badge
                className={cn("text-xs whitespace-nowrap", STATUS_COLORS[helpRequest.status])}
              >
                {getStatusLabel(helpRequest.status, "trap")}
              </Badge>
            );
          }
          const lifecycle = toCaseLifecycleStatus(helpRequest);
          return (
            <Badge
              className={cn("text-xs whitespace-nowrap", LIFECYCLE_STATUS_COLORS[lifecycle])}
            >
              {getCaseLifecycleLabel(helpRequest)}
            </Badge>
          );
        },
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
          const lockOpen = claimBeforeReview && isUnclaimed;
          return (
            <div className="flex flex-wrap gap-2">
              {lockOpen ? null : (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/case/${helpRequest.id}`}>
                    {claimBeforeReview && isMine ? "Review" : "Open"}
                  </Link>
                </Button>
              )}
              {canClaim && isUnclaimed && (
                <Button
                  size="sm"
                  onClick={() => mutateCaseClaim(helpRequest.id, "claim")}
                >
                  Claim to review
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
  }, [canClaim, userEmail, isAdmin, statusLabelContext, claimBeforeReview]);

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
