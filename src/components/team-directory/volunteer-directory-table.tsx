"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ControlSearch, PageControlBar } from "@/components/layout/page-control-bar";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import { volunteerRoleLabel } from "@/lib/hotspots/volunteer-role-filter";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { VolunteerRole } from "@/lib/types";
import type { VolunteerDirectoryEntry } from "@/lib/team-directory/load-directory";

interface VolunteerDirectoryTableProps {
  entries: VolunteerDirectoryEntry[];
  teams: { id: string; name: string }[];
  isAdmin?: boolean;
}

function matchesSearch(entry: VolunteerDirectoryEntry, query: string): boolean {
  const haystack = [
    entry.full_name,
    entry.email,
    entry.phone,
    entry.address,
    entry.team_name,
    ...entry.volunteer_roles.map((role) => volunteerRoleLabel(role)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function uniqueEmails(entries: VolunteerDirectoryEntry[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const entry of entries) {
    if (!entry.email?.trim()) continue;
    const normalized = entry.email.trim().toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    emails.push(entry.email.trim());
  }
  return emails;
}

export function VolunteerDirectoryTable({
  entries,
  teams,
  isAdmin = false,
}: VolunteerDirectoryTableProps) {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<VolunteerRole | "all">("all");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [allEmailsCopied, setAllEmailsCopied] = useState(false);

  async function copyEmail(email: string) {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    window.setTimeout(() => setCopiedEmail(null), 2000);
  }

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

  async function copyAllEmails() {
    const emails = uniqueEmails(filtered);
    if (!emails.length) return;

    await navigator.clipboard.writeText(emails.join("\n"));
    setAllEmailsCopied(true);
    window.setTimeout(() => setAllEmailsCopied(false), 2000);
  }

  const columns = useMemo((): DataTableColumn<VolunteerDirectoryEntry>[] => {
    return [
      {
        id: "name",
        label: "Name",
        defaultWidth: 160,
        sortValue: (entry) => entry.full_name ?? entry.email ?? "",
        render: (entry) => <span className="font-medium">{entry.full_name ?? "—"}</span>,
      },
      {
        id: "volunteer_roles",
        label: "Volunteer roles",
        defaultWidth: 220,
        sortValue: (entry) =>
          entry.volunteer_roles.map((role) => volunteerRoleLabel(role)).join(", "),
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
        sortValue: (entry) => entry.team_name ?? "",
        render: (entry) => entry.team_name ?? "—",
      },
      {
        id: "phone",
        label: "Phone",
        defaultWidth: 130,
        sortValue: (entry) => entry.phone ?? "",
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
        defaultWidth: 320,
        minWidth: 220,
        wrap: true,
        sortValue: (entry) => entry.email ?? "",
        render: (entry) =>
          entry.email ? (
            <div className="flex w-max max-w-full items-start gap-2">
              <a
                href={`mailto:${entry.email}`}
                className="break-all text-primary hover:underline select-text"
              >
                {entry.email}
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1 px-2 text-xs"
                aria-label={`Copy ${entry.email}`}
                title="Copy email"
                onClick={() => copyEmail(entry.email!)}
              >
                {copiedEmail === entry.email ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-primary" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          ) : (
            "—"
          ),
      },
      {
        id: "address",
        label: "Address",
        defaultWidth: 260,
        sortValue: (entry) => entry.address ?? "",
        render: (entry) =>
          entry.address ? (
            <span className="text-muted-foreground">{entry.address}</span>
          ) : (
            "—"
          ),
      },
    ];
  }, [copiedEmail]);

  const filteredEmailCount = uniqueEmails(filtered).length;
  const activeFilterCount =
    (teamFilter !== "all" ? 1 : 0) + (roleFilter !== "all" ? 1 : 0);

  return (
    <div className="space-y-4">
      <PageControlBar
        activeFilterCount={activeFilterCount}
        search={
          <ControlSearch
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone, address…"
            aria-label="Search team directory"
          />
        }
        filters={
          <>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[200px]">
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

            <Select
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value as VolunteerRole | "all")}
            >
              <SelectTrigger className="h-9 w-full sm:w-[220px]">
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
          </>
        }
        actions={
          isAdmin ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={filteredEmailCount === 0}
              onClick={copyAllEmails}
            >
              {allEmailsCopied ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Copy {filteredEmailCount} email{filteredEmailCount === 1 ? "" : "s"}
                </>
              )}
            </Button>
          ) : undefined
        }
        meta={
          <>
            Showing {filtered.length} of {entries.length} team members
          </>
        }
      />

      <DataTable
        tableId="team-directory"
        columns={columns}
        rows={filtered}
        getRowKey={(entry) => entry.id}
        emptyMessage="No team members match your filters."
        minTableWidth={900}
        enableSearch={false}
        columnSizing="content"
      />
    </div>
  );
}
