"use client";

import { useMemo, useState } from "react";
import { Check, ClipboardCopy, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { VolunteerRole } from "@/lib/types";
import type { VolunteerDirectoryEntry } from "@/lib/team-directory/load-directory";

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
    const normalized = entry.email.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    emails.push(entry.email.trim());
  }
  return emails;
}

export function VolunteerDirectoryTable({ entries, teams }: VolunteerDirectoryTableProps) {
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
        render: (entry) => <span className="font-medium">{entry.full_name ?? "—"}</span>,
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
        defaultWidth: 240,
        render: (entry) => (
          <div className="flex min-w-0 items-center gap-1">
            <a
              href={`mailto:${entry.email}`}
              className="min-w-0 flex-1 break-all text-primary hover:underline select-text"
            >
              {entry.email}
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-label={`Copy ${entry.email}`}
              onClick={() => copyEmail(entry.email)}
            >
              {copiedEmail === entry.email ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ),
      },
      {
        id: "address",
        label: "Address",
        defaultWidth: 260,
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {entries.length} team members
        </p>
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
              <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
              Copy {filteredEmailCount} email{filteredEmailCount === 1 ? "" : "s"}
            </>
          )}
        </Button>
      </div>

      <DataTable
        tableId="team-directory"
        columns={columns}
        rows={filtered}
        getRowKey={(entry) => entry.id}
        emptyMessage="No team members match your filters."
        minTableWidth={820}
      />
    </div>
  );
}
