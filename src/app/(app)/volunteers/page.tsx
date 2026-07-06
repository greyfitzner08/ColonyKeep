import { createClient } from "@/lib/supabase/server";
import { VolunteersManager } from "@/components/volunteers/volunteers-manager";
import { VolunteerRoleRequestsPanel } from "@/components/volunteers/volunteer-role-requests-panel";
import { fetchVolunteerRoleCatalogInputs } from "@/lib/volunteers/load-role-catalog";
import type { VolunteerApplication, TrapTeam, VolunteerRoleRequest, Profile } from "@/lib/types";

interface VolunteersPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function VolunteersPage({ searchParams }: VolunteersPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("volunteer_applications").select("*").order("created_at", { ascending: false });
  if (params.status) {
    query = query.eq("status", params.status);
  }

  const [{ data: applications }, { data: teams }, { data: roleRequests }, { data: profiles }, { catalog }] =
    await Promise.all([
    query,
    supabase.from("trap_teams").select("*").eq("is_active", true),
    supabase.from("volunteer_role_requests").select("*").order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select(
        "email, volunteer_roles, role, full_name, must_change_password, tnvr_certificate_uploaded, tnvr_certificate_url"
      ),
    fetchVolunteerRoleCatalogInputs(supabase),
  ]);

  const profilesByEmail = Object.fromEntries(
    (profiles ?? []).map((profile) => [profile.email.toLowerCase(), profile as Profile])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Volunteer Applications</h1>
        <p className="text-muted-foreground">
          Review applications, approved volunteer interests, and role expansion requests
        </p>
      </div>
      <VolunteerRoleRequestsPanel
        requests={(roleRequests ?? []) as VolunteerRoleRequest[]}
      />
      <VolunteersManager
        applications={(applications ?? []) as VolunteerApplication[]}
        teams={(teams ?? []) as TrapTeam[]}
        profilesByEmail={profilesByEmail}
        roleRequests={(roleRequests ?? []) as VolunteerRoleRequest[]}
        roleDescriptions={catalog}
      />
    </div>
  );
}
