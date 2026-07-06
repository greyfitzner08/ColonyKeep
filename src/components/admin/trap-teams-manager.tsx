"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VolunteerTeamPicker } from "@/components/admin/volunteer-team-picker";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getTeamEligibleVolunteers } from "@/lib/volunteers/eligibility";
import type { Profile, TrapTeam, VolunteerApplication } from "@/lib/types";
import { Pencil, Plus, X } from "lucide-react";

interface TrapTeamsManagerProps {
  teams: TrapTeam[];
  users: Profile[];
  applications: VolunteerApplication[];
}

function formatLead(team: TrapTeam, profileByEmail: Map<string, Profile>): string {
  const email = team.lead_email?.trim();
  if (!email) return "—";

  const profile = profileByEmail.get(email.toLowerCase());
  if (profile?.full_name?.trim()) {
    return `${profile.full_name.trim()} · ${email}`;
  }

  return email;
}

function formatZipCodes(zipCodes: string[]): string {
  if (zipCodes.length === 0) return "—";
  return zipCodes.join(", ");
}

export function TrapTeamsManager({ teams, users, applications }: TrapTeamsManagerProps) {
  const router = useRouter();
  const [teamDialog, setTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TrapTeam | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: "",
    region: "",
    zip_codes: "",
    lead_email: "",
    notes: "",
  });

  const eligibleVolunteers = useMemo(
    () => getTeamEligibleVolunteers(applications, users),
    [applications, users]
  );

  const profileByEmail = useMemo(
    () => new Map(users.map((user) => [user.email.toLowerCase(), user])),
    [users]
  );

  const editingMembers = useMemo(() => {
    if (!editingTeam) return [];
    return editingTeam.members
      .map((email) => profileByEmail.get(email.toLowerCase()))
      .filter(Boolean) as Profile[];
  }, [editingTeam, profileByEmail]);

  async function assignVolunteerToTeam(userId: string, teamId: string | null) {
    const response = await fetch("/api/admin/teams/assign-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, teamId }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error ?? "Unable to update team assignment");
    }
    router.refresh();
  }

  async function removeVolunteerFromTeam(userId: string) {
    setTeamError(null);
    try {
      await assignVolunteerToTeam(userId, null);
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Unable to update team assignment");
    }
  }

  function openTeamDialog(team?: TrapTeam) {
    if (team) {
      setEditingTeam(team);
      setTeamForm({
        name: team.name,
        region: team.region,
        zip_codes: team.zip_codes.join(", "),
        lead_email: team.lead_email,
        notes: team.notes ?? "",
      });
    } else {
      setEditingTeam(null);
      setTeamForm({ name: "", region: "", zip_codes: "", lead_email: "", notes: "" });
    }
    setTeamError(null);
    setTeamDialog(true);
  }

  async function saveTeam() {
    const existingMembers = editingTeam?.members ?? [];
    const payload = {
      id: editingTeam?.id,
      name: teamForm.name,
      region: teamForm.region,
      zip_codes: teamForm.zip_codes.split(",").map((s) => s.trim()).filter(Boolean),
      members: existingMembers,
      lead_email: teamForm.lead_email,
      notes: teamForm.notes,
      is_active: true,
    };

    setTeamError(null);
    setSavingTeam(true);
    const response = await fetch("/api/admin/trap-teams/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    setSavingTeam(false);

    if (!response.ok) {
      setTeamError(result?.error ?? "Unable to save team");
      return;
    }

    setTeamDialog(false);
    router.refresh();
  }

  const teamColumns = useMemo((): DataTableColumn<TrapTeam>[] => {
    return [
      {
        id: "team",
        label: "Team",
        defaultWidth: 140,
        sortValue: (team) => team.name,
        render: (team) => (
          <div>
            <p className="text-sm font-medium">{team.name}</p>
            {team.region && <p className="text-xs text-muted-foreground">{team.region}</p>}
          </div>
        ),
      },
      {
        id: "zip_codes",
        label: "ZIP codes",
        defaultWidth: 260,
        sortValue: (team) => formatZipCodes(team.zip_codes),
        render: (team) => (
          <p className="line-clamp-2 text-sm text-muted-foreground">{formatZipCodes(team.zip_codes)}</p>
        ),
      },
      {
        id: "lead",
        label: "Lead",
        defaultWidth: 220,
        sortValue: (team) => formatLead(team, profileByEmail),
        render: (team) => (
          <p className="truncate text-sm text-muted-foreground">{formatLead(team, profileByEmail)}</p>
        ),
      },
      {
        id: "actions",
        label: "Actions",
        defaultWidth: 100,
        minWidth: 88,
        headerClassName: "text-right",
        cellClassName: "text-right",
        render: (team) => (
          <Button type="button" size="sm" variant="outline" onClick={() => openTeamDialog(team)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        ),
      },
    ];
  }, [profileByEmail]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Manage trap team coverage areas and team leads. Assign volunteers from the edit dialog.
        </p>
        <Button type="button" onClick={() => openTeamDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add team
        </Button>
      </div>

      <DataTable
        tableId="admin-trap-teams"
        columns={teamColumns}
        rows={sortTrapTeams(teams)}
        getRowKey={(team) => team.id}
        emptyMessage="No trap teams configured yet."
        searchPlaceholder="Search trap teams…"
      />

      {teamError && !teamDialog && <p className="text-sm text-destructive">{teamError}</p>}

      <Dialog open={teamDialog} onOpenChange={setTeamDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit trap team" : "Add trap team"}</DialogTitle>
            <DialogDescription>
              Update team details and manage volunteer assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Region</Label>
              <Input
                value={teamForm.region}
                onChange={(e) => setTeamForm({ ...teamForm, region: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Lead email</Label>
              <Input
                type="email"
                value={teamForm.lead_email}
                onChange={(e) => setTeamForm({ ...teamForm, lead_email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>ZIP codes (comma-separated)</Label>
              <Input
                value={teamForm.zip_codes}
                onChange={(e) => setTeamForm({ ...teamForm, zip_codes: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={teamForm.notes}
                onChange={(e) => setTeamForm({ ...teamForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            {editingTeam && (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label>Team members ({editingMembers.length})</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only approved volunteers with TNVR certificate, shadow training, and signed forms
                    can be assigned.
                  </p>
                </div>

                {editingMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No volunteers assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {editingMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.full_name ?? member.email}
                          </p>
                          {member.full_name && (
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVolunteerFromTeam(member.id)}
                          aria-label={`Remove ${member.full_name ?? member.email} from team`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Add approved volunteer</Label>
                  <VolunteerTeamPicker
                    eligibleVolunteers={eligibleVolunteers}
                    assignedEmails={editingTeam.members}
                    onAssign={async (userId) => {
                      setTeamError(null);
                      try {
                        await assignVolunteerToTeam(userId, editingTeam.id);
                      } catch (error) {
                        setTeamError(
                          error instanceof Error ? error.message : "Unable to assign volunteer"
                        );
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {teamError && <p className="text-sm text-destructive">{teamError}</p>}

            <Button type="button" onClick={saveTeam} className="w-full" disabled={savingTeam}>
              {savingTeam ? "Saving..." : editingTeam ? "Save changes" : "Create team"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
