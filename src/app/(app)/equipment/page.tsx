import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { canManageTrapEquipment } from "@/lib/permissions";
import { isTrapSchoolTeamName } from "@/lib/cases/assign-case-team";
import { buildVolunteerOptions } from "@/lib/equipment/volunteers";
import { TrapEquipmentManager } from "@/components/equipment/trap-equipment-manager";
import { PageHeader } from "@/components/layout/page-header";
import type { TrapEquipmentItem, TrapTeam } from "@/lib/types";

export default async function EquipmentPage() {
  const profile = await getAppProfile();
  if (!canManageTrapEquipment(profile)) redirect("/");

  const supabase = await createClient();
  const service = await createServiceClient();
  const isAdmin = profile?.role === "admin";
  const teamFilterId = isAdmin ? null : profile?.team_id ?? null;

  let itemsQuery = supabase
    .from("trap_equipment_items")
    .select("*")
    .order("equipment_type")
    .order("created_at", { ascending: false });

  if (!isAdmin && profile?.team_id) {
    itemsQuery = itemsQuery.eq("team_id", profile.team_id);
  }

  let profilesQuery = service
    .from("profiles")
    .select("id, email, full_name, volunteer_roles, team_id, role, phone")
    .not("role", "is", null);

  if (teamFilterId) {
    // Include this team's TNVR members plus org admins (who may not have a team_id).
    profilesQuery = profilesQuery.or(`team_id.eq.${teamFilterId},role.eq.admin`);
  }

  const [{ data: items }, { data: teams }, { data: profiles }, { data: applications }] =
    await Promise.all([
      itemsQuery,
      supabase.from("trap_teams").select("id, name").eq("is_active", true).order("name"),
      profilesQuery,
      service.from("volunteer_applications").select("email, phone"),
    ]);

  const phonesByEmail = new Map<string, string>();
  for (const entry of profiles ?? []) {
    if (entry.phone?.trim()) {
      phonesByEmail.set(entry.email.toLowerCase(), entry.phone.trim());
    }
  }
  for (const application of applications ?? []) {
    const email = application.email?.toLowerCase();
    const phone = application.phone?.trim();
    if (email && phone && !phonesByEmail.has(email)) {
      phonesByEmail.set(email, phone);
    }
  }

  const volunteers = buildVolunteerOptions(profiles ?? [], phonesByEmail, teamFilterId);
  // Trap School is a case-routing team, not an equipment-holding team.
  const equipmentTeams = ((teams ?? []) as TrapTeam[]).filter(
    (team) => !isTrapSchoolTeamName(team.name)
  );
  const userTeam = equipmentTeams.find((team) => team.id === profile?.team_id) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trap Equipment"
        description={
          userTeam
            ? `Track traps, scanners, and field gear for ${userTeam.name}. Scan a trap QR code to claim it, or record borrower contact when gear is loaned out.`
            : "Track traps, scanners, and field gear. Scan a trap QR code to claim it, or record borrower contact when gear is loaned out."
        }
      />
      <TrapEquipmentManager
        items={(items ?? []) as TrapEquipmentItem[]}
        teams={equipmentTeams}
        volunteers={volunteers}
        defaultTeamId={profile?.team_id ?? null}
        currentProfileId={profile?.id ?? ""}
        currentUserName={profile?.full_name?.trim() || profile?.email || "You"}
        isAdmin={isAdmin}
      />
    </div>
  );
}
