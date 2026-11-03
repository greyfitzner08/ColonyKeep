import type { SupabaseClient } from "@supabase/supabase-js";
import { syncProfileTeamMembership } from "@/lib/admin/team-members";
import { findTrapTeamForZip, type TrapTeamZipMatch } from "@/lib/cases/assign-team-by-zip";
import {
  canAssignVolunteerToTeam,
  hasTrapTeamMemberRoles,
} from "@/lib/volunteers/eligibility";
import type { UserRole, VolunteerApplication, VolunteerRole } from "@/lib/types";

type TrainingSource = Pick<
  VolunteerApplication,
  "tnvr_certificate_uploaded" | "shadow_completed" | "roles_requested"
>;

export async function loadActiveTrapTeamsForZipMatch(
  service: SupabaseClient
): Promise<TrapTeamZipMatch[]> {
  const { data, error } = await service
    .from("trap_teams")
    .select("id, name, zip_codes, is_active")
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TrapTeamZipMatch[];
}

export function isEligibleForTrapTeamAutoAssign(
  volunteerRoles: VolunteerRole[],
  application?: TrainingSource | null,
  options?: { platformRole?: UserRole | string | null }
): boolean {
  // Platform TNVR Team / admin access is enough — do not wait on volunteer-interest training gates.
  if (options?.platformRole === "trap_team_lead" || options?.platformRole === "admin") {
    return true;
  }

  const profileLike = { volunteer_roles: volunteerRoles };
  const applicationLike: TrainingSource = {
    roles_requested: application?.roles_requested ?? volunteerRoles,
    tnvr_certificate_uploaded: application?.tnvr_certificate_uploaded ?? false,
    shadow_completed: application?.shadow_completed ?? false,
  };

  if (!hasTrapTeamMemberRoles(profileLike, applicationLike)) return false;
  return canAssignVolunteerToTeam(applicationLike, profileLike);
}

/**
 * Assign a TNVR-eligible volunteer to the trap team covering their home ZIP.
 * By default only fills an empty team_id so admin assignments are preserved.
 */
export async function autoAssignTrapTeamByHomeZip(
  service: SupabaseClient,
  params: {
    profileId: string;
    email: string;
    homeZip: string | null | undefined;
    currentTeamId: string | null;
    volunteerRoles: VolunteerRole[];
    application?: TrainingSource | null;
    platformRole?: UserRole | string | null;
    onlyIfUnassigned?: boolean;
    teams?: TrapTeamZipMatch[];
  }
): Promise<{ teamId: string; teamName: string } | null> {
  const onlyIfUnassigned = params.onlyIfUnassigned !== false;
  if (onlyIfUnassigned && params.currentTeamId) return null;

  if (
    !isEligibleForTrapTeamAutoAssign(params.volunteerRoles, params.application, {
      platformRole: params.platformRole,
    })
  ) {
    return null;
  }

  const teams = params.teams ?? (await loadActiveTrapTeamsForZipMatch(service));
  const match = findTrapTeamForZip(params.homeZip, teams);
  if (!match) return null;
  if (params.currentTeamId === match.id) {
    return { teamId: match.id, teamName: match.name };
  }

  await syncProfileTeamMembership(
    service,
    {
      id: params.profileId,
      email: params.email,
      team_id: params.currentTeamId,
    },
    match.id
  );

  return { teamId: match.id, teamName: match.name };
}

/** One-shot / admin backfill for unassigned eligible profiles. */
export async function backfillTrapTeamAssignmentsByHomeZip(
  service: SupabaseClient
): Promise<{ assigned: number; skipped: number }> {
  const teams = await loadActiveTrapTeamsForZipMatch(service);
  const { data: profiles, error } = await service
    .from("profiles")
    .select(
      "id, email, role, team_id, home_zip, volunteer_roles, tnvr_certificate_uploaded"
    )
    .not("role", "is", null)
    .is("team_id", null);

  if (error) {
    throw new Error(error.message);
  }

  const emails = (profiles ?? []).map((profile) => profile.email.toLowerCase());
  const { data: applications } = emails.length
    ? await service
        .from("volunteer_applications")
        .select("email, tnvr_certificate_uploaded, shadow_completed, roles_requested")
        .in("email", emails)
    : { data: [] };

  const applicationByEmail = new Map(
    (applications ?? []).map((application) => [
      String(application.email).toLowerCase(),
      application as TrainingSource & { email: string },
    ])
  );

  let assigned = 0;
  let skipped = 0;

  for (const profile of profiles ?? []) {
    const application = applicationByEmail.get(profile.email.toLowerCase()) ?? {
      roles_requested: (profile.volunteer_roles ?? []) as VolunteerRole[],
      tnvr_certificate_uploaded: Boolean(profile.tnvr_certificate_uploaded),
      shadow_completed: false,
    };

    const result = await autoAssignTrapTeamByHomeZip(service, {
      profileId: profile.id,
      email: profile.email,
      homeZip: profile.home_zip,
      currentTeamId: profile.team_id,
      volunteerRoles: (profile.volunteer_roles ?? []) as VolunteerRole[],
      application,
      platformRole: profile.role,
      teams,
      onlyIfUnassigned: true,
    });

    if (result) assigned += 1;
    else skipped += 1;
  }

  return { assigned, skipped };
}

/** Load profile + latest application and assign by home ZIP if eligible and unassigned. */
export async function tryAutoAssignTrapTeamForProfile(
  service: SupabaseClient,
  profileId: string
): Promise<{ teamId: string; teamName: string } | null> {
  const { data: profile, error } = await service
    .from("profiles")
    .select(
      "id, email, role, team_id, home_zip, volunteer_roles, tnvr_certificate_uploaded"
    )
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile || profile.team_id) return null;

  const { data: application } = await service
    .from("volunteer_applications")
    .select("tnvr_certificate_uploaded, shadow_completed, roles_requested")
    .eq("email", profile.email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return autoAssignTrapTeamByHomeZip(service, {
    profileId: profile.id,
    email: profile.email,
    homeZip: profile.home_zip,
    currentTeamId: profile.team_id,
    volunteerRoles: (profile.volunteer_roles ?? []) as VolunteerRole[],
    platformRole: profile.role,
    application: application
      ? {
          roles_requested: (application.roles_requested ??
            profile.volunteer_roles ??
            []) as VolunteerRole[],
          tnvr_certificate_uploaded: Boolean(application.tnvr_certificate_uploaded),
          shadow_completed: Boolean(application.shadow_completed),
        }
      : {
          roles_requested: (profile.volunteer_roles ?? []) as VolunteerRole[],
          tnvr_certificate_uploaded: Boolean(profile.tnvr_certificate_uploaded),
          shadow_completed: false,
        },
    onlyIfUnassigned: true,
  });
}

