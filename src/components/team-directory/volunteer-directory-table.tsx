"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import { volunteerRoleLabel } from "@/lib/hotspots/volunteer-role-filter";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { UserRole, VolunteerRole } from "@/lib/types";
import type { VolunteerDirectoryEntry } from "@/lib/team-directory/load-directory";

const PLATFORM_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  inquiry_team: "Inquiry Team",
  trap_team_lead: "Trap Team Lead",
  clinic_coordination: "Clinic Coordination",
  volunteer: "Volunteer",
};

interface VolunteerDirectoryTableProps {
  entries: VolunteerDirectoryEntry[];
  teams: { id: string; name: string }[];
}

function matchesSearch(entry: VolunteerDirectoryEntry, query: string): boolean {
  const haystack = [
    entry.full_name,
    entry.email,
    entry.phone,
    entry.address,
    entry.team_name,
    PLATFORM_ROLE_LABELS[entry.platform_role],
    ...entry.volunteer_roles.map((role) => volunteerRoleLabel(role)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function VolunteerDirectoryTable({ entries, teams }: VolunteerDirectoryTableProps) {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<VolunteerRole | "all">("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (query && !matchesSearch(entry, query)) return false;
      if (teamFilter === "unassigned" && entry.team_id) return false;
      if (teamFilter !== "all" && teamFilter !== "unassigned" && entry.team_id !== teamFilter) {
        return false;
      }
      if (roleFilter !== "all" && !entry.volunteer_roles.includes(roleFilter)) return false;
      return true;
    });
  }, [entries, roleFilter, search, teamFilter]);

  const columns = useMemo((): DataTableColumn<VolunteerDirectoryEntry>[] => {
    return [
      {
        id: "name",
        label: "Name",
        defaultWidth: 160,
        render: (entry) => <span className="font-medium">{entry.full_name ?? "—"}</span>,
      },
      {
        id: "platform_role",
        label: "Platform role",
        defaultWidth: 140,
        render: (entry) => PLATFORM_ROLE_LABELS[entry.platform_role],
      },
      {
        id: "volunteer_roles",
        label: "Volunteer roles",
        defaultWidth: 220,
        render: (entry) =>
          entry.volunteer_roles.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {entry.volunteer_roles.map((role) => (
                <Badge key={role} variant="secondary" className="font-normal">
                  {volunteerRoleLabel(role)}
                </Badge>
              ))}
            </div>
          ),
      },
      {
        id: "team",
        label: "Trap team",
        defaultWidth: 120,
        render: (entry) => entry.team_name ?? "—",
      },
      {
        id: "phone",
        label: "Phone",
        defaultWidth: 130,
        render: (entry) =>
          entry.phone ? (
            <a href={`tel:${entry.phone}`} className="whitespace-nowrap text-primary hover:underline">
              {entry.phone}
            </a>
          ) : (
            "—"
          ),
      },
      {
        id: "email",
        label: "Email",
        defaultWidth: 200,
        render: (entry) => (
          <a href={`mailto:${entry.email}`} className="break-all text-primary hover:underline">
            {entry.email}
          </a>
        ),
      },
      {
        id: "address",
        label: "Address",
        defaultWidth: 260,
        render: (entry) => <span className="text-muted-foreground">{entry.address}</span>,
      },
    ];
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone, address…"
            className="pl-9"
          />
        </div>

        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Trap team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            <SelectItem value="unassigned">No trap team</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as VolunteerRole | "all")}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Volunteer role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All volunteer roles</SelectItem>
            {VOLUNTEER_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {entries.length} team members
      </p>

      <DataTable
        tableId="team-directory"
        columns={columns}
        rows={filtered}
        getRowKey={(entry) => entry.id}
        emptyMessage="No team members match your filters."
        minTableWidth={960}
      />
    </div>
  );
}
