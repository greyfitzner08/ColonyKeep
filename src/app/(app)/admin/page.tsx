import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import type { Profile, TrapTeam, RoleDescription, VolunteerApplication } from "@/lib/types";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();
  const [{ data: users }, { data: teams }, { data: roleDescriptions }, { data: applications }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("email"),
      supabase.from("trap_teams").select("*").order("name"),
      supabase.from("role_descriptions").select("*").order("label"),
      supabase.from("volunteer_applications").select("*").order("created_at", { ascending: false }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">Manage users, teams, and role descriptions</p>
      </div>
      <AdminPanel
        users={(users ?? []) as Profile[]}
        teams={(teams ?? []) as TrapTeam[]}
        roleDescriptions={(roleDescriptions ?? []) as RoleDescription[]}
        applications={(applications ?? []) as VolunteerApplication[]}
      />
    </div>
  );
}
