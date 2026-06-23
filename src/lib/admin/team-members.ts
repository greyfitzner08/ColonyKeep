import type { SupabaseClient } from "@supabase/supabase-js";

export async function removeEmailFromTeam(
  service: SupabaseClient,
  teamId: string,
  email: string
) {
  const { data: team } = await service
    .from("trap_teams")
    .select("members")
    .eq("id", teamId)
    .single();

  if (!team) return;

  const members = (team.members ?? []).filter(
    (member: string) => member.toLowerCase() !== email.toLowerCase()
  );

  await service.from("trap_teams").update({ members }).eq("id", teamId);
}

export async function addEmailToTeam(
  service: SupabaseClient,
  teamId: string,
  email: string
) {
  const { data: team } = await service
    .from("trap_teams")
    .select("members")
    .eq("id", teamId)
    .single();

  if (!team) {
    throw new Error("Team not found");
  }

  const members = team.members ?? [];
  if (members.some((member: string) => member.toLowerCase() === email.toLowerCase())) {
    return;
  }

  const { error } = await service
    .from("trap_teams")
    .update({ members: [...members, email] })
    .eq("id", teamId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function syncProfileTeamMembership(
  service: SupabaseClient,
  profile: { id: string; email: string; team_id: string | null },
  nextTeamId: string | null
) {
  const previousTeamId = profile.team_id;

  if (previousTeamId && previousTeamId !== nextTeamId) {
    await removeEmailFromTeam(service, previousTeamId, profile.email);
  }

  if (nextTeamId) {
    await addEmailToTeam(service, nextTeamId, profile.email);
  }

  const { error } = await service
    .from("profiles")
    .update({ team_id: nextTeamId })
    .eq("id", profile.id);

  if (error) {
    throw new Error(error.message);
  }
}
