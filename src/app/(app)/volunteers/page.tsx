import { createClient } from "@/lib/supabase/server";
import { VolunteersManager } from "@/components/volunteers/volunteers-manager";
import type { VolunteerApplication, TrapTeam } from "@/lib/types";

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

  const [{ data: applications }, { data: teams }] = await Promise.all([
    query,
    supabase.from("trap_teams").select("*").eq("is_active", true),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Volunteer Applications</h1>
        <p className="text-muted-foreground">Review and manage volunteer applications</p>
      </div>
      <VolunteersManager
        applications={(applications ?? []) as VolunteerApplication[]}
        teams={(teams ?? []) as TrapTeam[]}
      />
    </div>
  );
}
