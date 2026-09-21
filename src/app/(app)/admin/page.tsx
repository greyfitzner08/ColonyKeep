import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import { PageHeader } from "@/components/layout/page-header";
import { getPlatformBranding } from "@/lib/branding-server";
import { fetchVolunteerRoleCatalogInputs } from "@/lib/volunteers/load-role-catalog";
import type { Profile, TrapTeam, VolunteerApplication } from "@/lib/types";

export default async function AdminPage() {
  const profile = await getAppProfile();
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();
  const [
    { data: users },
    { data: teams },
    { roleDescriptions, disabledRoleIds },
    { data: applications },
    branding,
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("email"),
    supabase.from("trap_teams").select("*").order("name"),
    fetchVolunteerRoleCatalogInputs(supabase),
    supabase.from("volunteer_applications").select("*").order("created_at", { ascending: false }),
    getPlatformBranding(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Settings"
        description="Manage users, teams, branding, and role descriptions"
      />
      <AdminPanel
        users={(users ?? []) as Profile[]}
        teams={(teams ?? []) as TrapTeam[]}
        roleDescriptions={roleDescriptions}
        disabledRoleIds={disabledRoleIds}
        applications={(applications ?? []) as VolunteerApplication[]}
        branding={branding}
        currentUserId={profile.id}
      />
    </div>
  );
}
