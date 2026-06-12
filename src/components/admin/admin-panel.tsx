"use client";

import { useState } from "react";
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
import { ROLE_PERMISSIONS } from "@/lib/constants";
import type { Profile, TrapTeam, RoleDescription, UserRole } from "@/lib/types";
import { Plus, Pencil } from "lucide-react";

interface AdminPanelProps {
  users: Profile[];
  teams: TrapTeam[];
  roleDescriptions: RoleDescription[];
}

export function AdminPanel({ users, teams: initialTeams, roleDescriptions }: AdminPanelProps) {
  const router = useRouter();
  const [teamDialog, setTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TrapTeam | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: "",
    region: "",
    zip_codes: "",
    members: "",
    lead_email: "",
    notes: "",
  });

  async function updateUserRole(userId: string, role: UserRole, teamId: string | null) {
    const supabase = createClient();
    await supabase.from("profiles").update({ role, team_id: teamId }).eq("id", userId);
    router.refresh();
  }

  function openTeamDialog(team?: TrapTeam) {
    if (team) {
      setEditingTeam(team);
      setTeamForm({
        name: team.name,
        region: team.region,
        zip_codes: team.zip_codes.join(", "),
        members: team.members.join(", "),
        lead_email: team.lead_email,
        notes: team.notes ?? "",
      });
    } else {
      setEditingTeam(null);
      setTeamForm({ name: "", region: "", zip_codes: "", members: "", lead_email: "", notes: "" });
    }
    setTeamDialog(true);
  }

  async function saveTeam() {
    const supabase = createClient();
    const payload = {
      name: teamForm.name,
      region: teamForm.region,
      zip_codes: teamForm.zip_codes.split(",").map((s) => s.trim()).filter(Boolean),
      members: teamForm.members.split(",").map((s) => s.trim()).filter(Boolean),
      lead_email: teamForm.lead_email,
      notes: teamForm.notes,
      is_active: true,
    };
    if (editingTeam) {
      await supabase.from("trap_teams").update(payload).eq("id", editingTeam.id);
    } else {
      await supabase.from("trap_teams").insert(payload);
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

      <TabsContent value="users" className="mt-4 space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium">{user.full_name ?? user.email}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <Select
                  value={user.role ?? "none"}
                  onValueChange={(v) => updateUserRole(user.id, v as UserRole, user.team_id)}
                >
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Role</SelectItem>
                    {Object.entries(ROLE_PERMISSIONS).map(([role, { label }]) => (
                      <SelectItem key={role} value={role}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={user.team_id ?? "none"}
                  onValueChange={(v) => updateUserRole(user.id, (user.role ?? "volunteer") as UserRole, v === "none" ? null : v)}
                  disabled={!user.role}
                >
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Team</SelectItem>
                    {initialTeams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="teams" className="mt-4 space-y-4">
        <Button onClick={() => openTeamDialog()}><Plus className="h-4 w-4 mr-2" />Add Team</Button>
        {initialTeams.map((team) => (
          <Card key={team.id}>
            <CardHeader className="flex flex-row justify-between">
              <div>
                <CardTitle className="text-base">{team.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{team.region}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => openTeamDialog(team)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><strong>Lead:</strong> {team.lead_email}</p>
              <p><strong>ZIP codes:</strong> {team.zip_codes.join(", ") || "—"}</p>
              <p><strong>Members:</strong> {team.members.length}</p>
              <Badge variant={team.is_active ? "default" : "secondary"}>{team.is_active ? "Active" : "Inactive"}</Badge>
            </CardContent>
          </Card>
        ))}
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
            <div className="space-y-1"><Label>Members (emails, comma-separated)</Label><Input value={teamForm.members} onChange={(e) => setTeamForm({ ...teamForm, members: e.target.value })} /></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={teamForm.notes} onChange={(e) => setTeamForm({ ...teamForm, notes: e.target.value })} /></div>
            <Button onClick={saveTeam} className="w-full">Save Team</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
