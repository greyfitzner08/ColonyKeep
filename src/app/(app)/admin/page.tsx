import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import { fetchVolunteerRoleCatalogInputs } from "@/lib/volunteers/load-role-catalog";
import type { Profile, TrapTeam, VolunteerApplication } from "@/lib/types";

export default async function AdminPage() {
  const profile = await getAppProfile();
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();
  const [{ data: users }, { data: teams }, { roleDescriptions, disabledRoleIds }, { data: applications }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("email"),
      supabase.from("trap_teams").select("*").order("name"),
      fetchVolunteerRoleCatalogInputs(supabase),
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
        roleDescriptions={roleDescriptions}
        disabledRoleIds={disabledRoleIds}
        applications={(applications ?? []) as VolunteerApplication[]}
        currentUserId={profile.id}
      />
    </div>
  );
}
