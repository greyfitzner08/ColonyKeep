"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest } from "@/lib/types";

function contactLabel(helpRequest: HelpRequest): string {
  return (
    [helpRequest.contact_first_name, helpRequest.contact_last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || helpRequest.contact_name?.trim() || "—"
  );
}

function colonyLabel(helpRequest: HelpRequest): string {
  const place = [helpRequest.colony_address, helpRequest.colony_city].filter(Boolean).join(", ");
  return place || "—";
}

function closedStamp(helpRequest: HelpRequest): string {
  const stamp = helpRequest.closed_at ?? helpRequest.updated_at;
  return stamp ? formatDateTime(stamp) : "—";
}

export function ClosedCasesList({
  cases,
  emptyMessage = "No closed cases in this view.",
}: {
  cases: HelpRequest[];
  emptyMessage?: string;
}) {
  const columns = useMemo((): DataTableColumn<HelpRequest>[] => {
    return [
      {
        id: "case_number",
        label: "Case #",
        defaultWidth: 120,
        sortValue: (helpRequest) => helpRequest.case_number,
        render: (helpRequest) => (
          <Link href={`/case/${helpRequest.id}`} className="font-medium text-primary hover:underline">
            {helpRequest.case_number}
          </Link>
        ),
      },
      {
        id: "contact",
        label: "Contact name",
        defaultWidth: 180,
        sortValue: (helpRequest) => contactLabel(helpRequest),
        render: (helpRequest) => contactLabel(helpRequest),
      },
      {
        id: "colony",
        label: "Colony",
        defaultWidth: 280,
        sortValue: (helpRequest) => colonyLabel(helpRequest),
        render: (helpRequest) => colonyLabel(helpRequest),
      },
      {
        id: "team",
        label: "Team",
        defaultWidth: 160,
        sortValue: (helpRequest) => helpRequest.assigned_team_name ?? "",
        render: (helpRequest) => helpRequest.assigned_team_name?.trim() || "—",
      },
      {
        id: "cats_fixed",
        label: "Cats fixed",
        defaultWidth: 120,
        sortValue: (helpRequest) => helpRequest.outcome_tnvr_count,
        render: (helpRequest) => String(helpRequest.outcome_tnvr_count),
      },
      {
        id: "closed",
        label: "Closed",
        defaultWidth: 180,
        sortValue: (helpRequest) => helpRequest.closed_at ?? helpRequest.updated_at ?? "",
        render: (helpRequest) => closedStamp(helpRequest),
      },
    ];
  }, []);

  return (
    <DataTable
      tableId="trap-queue-closed"
      columns={columns}
      rows={cases}
      getRowKey={(helpRequest) => helpRequest.id}
      defaultSort={{ columnId: "closed", direction: "desc" }}
      enableSearch={false}
      emptyMessage={emptyMessage}
      searchPlaceholder="Search closed cases…"
    />
  );
}
