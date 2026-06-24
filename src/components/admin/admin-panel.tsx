"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { VolunteerTeamPicker } from "@/components/admin/volunteer-team-picker";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import { getTeamEligibleVolunteers } from "@/lib/volunteers/eligibility";
import type { Profile, TrapTeam, RoleDescription, VolunteerApplication } from "@/lib/types";
import { Plus, Pencil, X } from "lucide-react";

interface AdminPanelProps {
  users: Profile[];
  teams: TrapTeam[];
  roleDescriptions: RoleDescription[];
  applications: VolunteerApplication[];
}

export function AdminPanel({
  users,
  teams: initialTeams,
  roleDescriptions,
  applications,
}: AdminPanelProps) {
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

  async function updateRoleDescription(id: string, description: string) {
    const supabase = createClient();
    await supabase.from("role_descriptions").update({ description }).eq("id", id);
    router.refresh();
  }

  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="teams">Trap Teams</TabsTrigger>
        <TabsTrigger value="roles">Role Descriptions</TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="mt-4">
        <AdminUsersManager
          users={users}
          teams={initialTeams}
          roleDescriptions={roleDescriptions}
          applications={applications}
        />
      </TabsContent>

      <TabsContent value="teams" className="mt-4 space-y-4">
        <Button onClick={() => openTeamDialog()}><Plus className="h-4 w-4 mr-2" />Add Team</Button>
        {initialTeams.map((team) => {
          const members = team.members
            .map((email) => profileByEmail.get(email.toLowerCase()))
            .filter(Boolean) as Profile[];

          return (
            <Card key={team.id}>
              <CardHeader className="flex flex-row justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{team.region}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openTeamDialog(team)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-1">
                  <p><strong>Lead:</strong> {team.lead_email}</p>
                  <p><strong>ZIP codes:</strong> {team.zip_codes.join(", ") || "—"}</p>
                  <Badge variant={team.is_active ? "default" : "secondary"}>
                    {team.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Team members ({members.length})</Label>
                  {members.length === 0 ? (
                    <p className="text-muted-foreground">No volunteers assigned yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <div>
                            <p className="font-medium">{member.full_name ?? member.email}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <Button
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
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Add approved volunteer</Label>
                  <VolunteerTeamPicker
                    eligibleVolunteers={eligibleVolunteers}
                    assignedEmails={team.members}
                    onAssign={async (userId) => {
                      setTeamError(null);
                      try {
                        await assignVolunteerToTeam(userId, team.id);
                      } catch (error) {
                        setTeamError(
                          error instanceof Error ? error.message : "Unable to assign volunteer"
                        );
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only volunteers with approved applications, TNVR certificates, field training, and signed forms appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {teamError && <p className="text-sm text-destructive">{teamError}</p>}
      </TabsContent>

      <TabsContent value="roles" className="mt-4 space-y-3">
        {roleDescriptions.map((rd) => (
          <Card key={rd.id}>
            <CardContent className="pt-4 space-y-2">
              <p className="font-medium">{rd.label}</p>
              <Textarea
                defaultValue={rd.description}
                onBlur={(e) => {
                  if (e.target.value !== rd.description) {
                    updateRoleDescription(rd.id, e.target.value);
                  }
                }}
                rows={2}
              />
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <Dialog open={teamDialog} onOpenChange={setTeamDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTeam ? "Edit Team" : "Add Team"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Region</Label><Input value={teamForm.region} onChange={(e) => setTeamForm({ ...teamForm, region: e.target.value })} /></div>
            <div className="space-y-1"><Label>Lead Email</Label><Input value={teamForm.lead_email} onChange={(e) => setTeamForm({ ...teamForm, lead_email: e.target.value })} /></div>
            <div className="space-y-1"><Label>ZIP Codes (comma-separated)</Label><Input value={teamForm.zip_codes} onChange={(e) => setTeamForm({ ...teamForm, zip_codes: e.target.value })} /></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={teamForm.notes} onChange={(e) => setTeamForm({ ...teamForm, notes: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">
              Assign volunteers to this team from the Trap Teams tab after saving.
            </p>
            {teamError && <p className="text-sm text-destructive">{teamError}</p>}
            <Button onClick={saveTeam} className="w-full" disabled={savingTeam}>
              {savingTeam ? "Saving..." : "Save Team"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
