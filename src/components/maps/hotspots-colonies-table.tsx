"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { STATUS_COLORS } from "@/lib/constants";
import { formatSingleLineAddress } from "@/lib/cases/colony-notes";
import { getStatusLabel, isHotspotColonyStatus } from "@/lib/cases/statuses";
import type { HelpRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HotspotsColoniesTableProps {
  helpRequests: HelpRequest[];
}

export function HotspotsColoniesTable({ helpRequests }: HotspotsColoniesTableProps) {
  const rows = useMemo(
    () => helpRequests.filter((hr) => isHotspotColonyStatus(hr.status)),
    [helpRequests]
  );

  const columns = useMemo((): DataTableColumn<HelpRequest>[] => {
    return [
      {
        id: "case_number",
        label: "Case #",
        defaultWidth: 120,
        minWidth: 100,
        render: (hr) => (
          <Link href={`/case/${hr.id}`} className="font-medium text-primary hover:underline">
            {hr.case_number}
          </Link>
        ),
      },
      {
        id: "status",
        label: "Status",
        defaultWidth: 160,
        minWidth: 130,
        render: (hr) => (
          <Badge className={cn("whitespace-normal text-xs", STATUS_COLORS[hr.status])}>
            {getStatusLabel(hr.status)}
          </Badge>
        ),
      },
      {
        id: "address",
        label: "Colony address",
        defaultWidth: 280,
        minWidth: 200,
        render: (hr) =>
          formatSingleLineAddress([
            hr.colony_address,
            hr.colony_city,
            hr.colony_state,
            hr.colony_zip,
            hr.colony_county,
          ]) ?? "—",
      },
      {
        id: "city",
        label: "City",
        defaultWidth: 140,
        minWidth: 100,
        render: (hr) => hr.colony_city ?? "—",
      },
      {
        id: "county",
        label: "County",
        defaultWidth: 140,
        minWidth: 100,
        render: (hr) => hr.colony_county ?? "—",
      },
      {
        id: "zip",
        label: "ZIP",
        defaultWidth: 90,
        minWidth: 80,
        render: (hr) => hr.colony_zip ?? "—",
      },
      {
        id: "team",
        label: "Trap team",
        defaultWidth: 150,
        minWidth: 120,
        render: (hr) => hr.assigned_team_name?.trim() || "Unassigned",
      },
      {
        id: "mapped",
        label: "Mapped",
        defaultWidth: 100,
        minWidth: 90,
        render: (hr) => (hr.colony_lat && hr.colony_lng ? "Yes" : "No"),
      },
    ];
  }, []);

  return (
    <DataTable
      tableId="hotspots-colonies"
      columns={columns}
      rows={rows}
      getRowKey={(hr) => hr.id}
      emptyMessage="No colony hotspots to show."
      minTableWidth={1180}
    />
  );
}
