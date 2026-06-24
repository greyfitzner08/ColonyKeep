import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { canManageTrapEquipment } from "@/lib/permissions";
import { TrapEquipmentManager } from "@/components/equipment/trap-equipment-manager";
import type { TrapEquipmentItem, TrapTeam } from "@/lib/types";

export default async function EquipmentPage() {
  const profile = await getCurrentProfile();
  if (!canManageTrapEquipment(profile)) redirect("/");

  const supabase = await createClient();
  const isAdmin = profile?.role === "admin";

  let itemsQuery = supabase
    .from("trap_equipment_items")
    .select("*")
    .order("equipment_type")
    .order("created_at", { ascending: false });

  if (!isAdmin && profile?.team_id) {
    itemsQuery = itemsQuery.eq("team_id", profile.team_id);
  }

  const [{ data: items }, { data: teams }] = await Promise.all([
    itemsQuery,
    supabase.from("trap_teams").select("id, name").eq("is_active", true).order("name"),
  ]);

  const userTeam = teams?.find((team) => team.id === profile?.team_id) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trap Equipment</h1>
        <p className="text-muted-foreground">
          Log traps, scanners, and other field equipment for your trap team.
          {userTeam ? ` Viewing inventory for ${userTeam.name}.` : " Viewing all teams."}
        </p>
      </div>
      <TrapEquipmentManager
        items={(items ?? []) as TrapEquipmentItem[]}
        teams={(teams ?? []) as TrapTeam[]}
        defaultTeamId={profile?.team_id ?? null}
        isAdmin={isAdmin}
      />
    </div>
  );
}
