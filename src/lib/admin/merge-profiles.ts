import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyVolunteerAssignmentDecisions,
  previewVolunteerAssignments,
  removeVolunteerUser,
  type AssignmentDecision,
} from "@/lib/admin/volunteer-assignments";
import { mergeVolunteerRoles } from "@/lib/volunteers/role-expansion";
import type { Profile, VolunteerApplication, VolunteerRole } from "@/lib/types";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function preferText(
  primary: string | null | undefined,
  secondary: string | null | undefined
): string | null {
  const a = primary?.trim() || null;
  const b = secondary?.trim() || null;
  return a || b;
}

function preferNumber(
  primary: number | null | undefined,
  secondary: number | null | undefined
): number | null {
  return primary ?? secondary ?? null;
}

async function addEmailAlias(
  service: SupabaseClient,
  profileId: string,
  email: string
): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const { data: primary } = await service
    .from("profiles")
    .select("email")
    .eq("id", profileId)
    .maybeSingle();

  if (primary && normalizeEmail(primary.email) === normalized) {
    return null;
  }

  const { data: existingAlias } = await service
    .from("profile_email_aliases")
    .select("id, profile_id")
    .eq("email", normalized)
    .maybeSingle();

  if (existingAlias) {
    if (existingAlias.profile_id === profileId) return null;
    const { error } = await service
      .from("profile_email_aliases")
      .update({ profile_id: profileId })
      .eq("id", existingAlias.id);
    return error?.message ?? null;
  }

  const { error } = await service.from("profile_email_aliases").insert({
    profile_id: profileId,
    email: normalized,
  });
  return error?.message ?? null;
}

async function mergeVolunteerApplications(
  service: SupabaseClient,
  primaryEmail: string,
  secondaryEmail: string
): Promise<string | null> {
  const [{ data: primaryApp }, { data: secondaryApp }] = await Promise.all([
    service.from("volunteer_applications").select("*").ilike("email", primaryEmail).maybeSingle(),
    service.from("volunteer_applications").select("*").ilike("email", secondaryEmail).maybeSingle(),
  ]);

  if (!secondaryApp) return null;

  if (!primaryApp) {
    const { error } = await service
      .from("volunteer_applications")
      .update({ email: primaryEmail })
      .eq("id", secondaryApp.id);
    return error?.message ?? null;
  }

  const mergedRoles = mergeVolunteerRoles(
    (primaryApp.roles_requested ?? []) as VolunteerRole[],
    (secondaryApp.roles_requested ?? []) as VolunteerRole[]
  );

  const update: Partial<VolunteerApplication> = {
    full_name: preferText(primaryApp.full_name, secondaryApp.full_name) ?? primaryApp.full_name,
    phone: preferText(primaryApp.phone, secondaryApp.phone) ?? primaryApp.phone,
    birthday: preferText(primaryApp.birthday, secondaryApp.birthday),
    home_street: preferText(primaryApp.home_street, secondaryApp.home_street),
    home_city: preferText(primaryApp.home_city, secondaryApp.home_city),
    home_state: preferText(primaryApp.home_state, secondaryApp.home_state),
    home_zip: preferText(primaryApp.home_zip, secondaryApp.home_zip),
    home_county: preferText(primaryApp.home_county, secondaryApp.home_county),
    roles_requested: mergedRoles,
    why_volunteer:
      preferText(primaryApp.why_volunteer, secondaryApp.why_volunteer) ?? primaryApp.why_volunteer,
    prior_experience: preferText(primaryApp.prior_experience, secondaryApp.prior_experience),
    availability: preferText(primaryApp.availability, secondaryApp.availability),
    how_heard: preferText(primaryApp.how_heard, secondaryApp.how_heard),
    admin_notes:
      [primaryApp.admin_notes, secondaryApp.admin_notes]
        .map((note) => note?.trim())
        .filter(Boolean)
        .join("\n\n") || null,
    liability_waiver_signed:
      primaryApp.liability_waiver_signed || secondaryApp.liability_waiver_signed,
    shadow_completed: primaryApp.shadow_completed || secondaryApp.shadow_completed,
    policy_signed: primaryApp.policy_signed || secondaryApp.policy_signed,
    intake_training: primaryApp.intake_training || secondaryApp.intake_training,
    tnvr_certificate_uploaded:
      primaryApp.tnvr_certificate_uploaded || secondaryApp.tnvr_certificate_uploaded,
    tnvr_certificate_url: preferText(
      primaryApp.tnvr_certificate_url,
      secondaryApp.tnvr_certificate_url
    ),
    event_crash_course: primaryApp.event_crash_course || secondaryApp.event_crash_course,
  };

  const { error: updateError } = await service
    .from("volunteer_applications")
    .update(update)
    .eq("id", primaryApp.id);
  if (updateError) return updateError.message;

  const { error: deleteError } = await service
    .from("volunteer_applications")
    .delete()
    .eq("id", secondaryApp.id);
  return deleteError?.message ?? null;
}

async function reassignTrapTeamMembership(
  service: SupabaseClient,
  secondaryEmail: string,
  primaryEmail: string
) {
  const secondary = normalizeEmail(secondaryEmail);
  const primary = normalizeEmail(primaryEmail);

  const { data: teams } = await service
    .from("trap_teams")
    .select("id, members")
    .contains("members", [secondary]);

  for (const team of teams ?? []) {
    const members = Array.from(
      new Set(
        (team.members ?? [])
          .map((member: string) => normalizeEmail(member))
          .filter((member: string) => member && member !== secondary)
          .concat(primary)
      )
    );
    await service.from("trap_teams").update({ members }).eq("id", team.id);
  }
}

async function mergeProfileFields(
  service: SupabaseClient,
  primary: Profile,
  secondary: Profile
): Promise<string | null> {
  const update = {
    full_name: preferText(primary.full_name, secondary.full_name),
    phone: preferText(primary.phone, secondary.phone),
    birthday: preferText(primary.birthday, secondary.birthday),
    home_street: preferText(primary.home_street, secondary.home_street),
    home_city: preferText(primary.home_city, secondary.home_city),
    home_state: preferText(primary.home_state, secondary.home_state),
    home_zip: preferText(primary.home_zip, secondary.home_zip),
    home_county: preferText(primary.home_county, secondary.home_county),
    home_lat: preferNumber(primary.home_lat, secondary.home_lat),
    home_lng: preferNumber(primary.home_lng, secondary.home_lng),
    volunteer_roles: mergeVolunteerRoles(
      primary.volunteer_roles ?? [],
      secondary.volunteer_roles ?? []
    ),
    team_id: primary.team_id ?? secondary.team_id,
    role: primary.role ?? secondary.role,
    tnvr_certificate_uploaded:
      primary.tnvr_certificate_uploaded || secondary.tnvr_certificate_uploaded,
    tnvr_certificate_url: preferText(
      primary.tnvr_certificate_url,
      secondary.tnvr_certificate_url
    ),
    show_on_hotspots_map: primary.show_on_hotspots_map || secondary.show_on_hotspots_map,
  };

  const { error } = await service.from("profiles").update(update).eq("id", primary.id);
  return error?.message ?? null;
}

function buildMergeDecisions(
  preview: Awaited<ReturnType<typeof previewVolunteerAssignments>>,
  primaryId: string
): Record<string, AssignmentDecision> {
  const decisions: Record<string, AssignmentDecision> = {};

  for (const group of preview.groups) {
    if (group.key === "volunteer_records" || group.key === "trap_team_membership") {
      decisions[group.key] = { action: "unassign" };
      continue;
    }
    if (group.reassignable || group.requiresReassign) {
      decisions[group.key] = { action: "reassign", targetUserId: primaryId };
    } else {
      decisions[group.key] = { action: "unassign" };
    }
  }

  return decisions;
}

export interface MergeProfilesResult {
  keptProfileId: string;
  mergedProfileId: string;
  keptEmail: string;
  aliasEmail: string;
  transferredGroups: string[];
}

/**
 * Merge secondary account into primary.
 * Keeps primary login email, stores secondary email as an alias, retargets live
 * assignments to primary, and removes the secondary auth user.
 */
export async function mergeVolunteerProfiles(
  service: SupabaseClient,
  options: {
    keepProfileId: string;
    mergeProfileId: string;
    actorUserId: string;
  }
): Promise<{ result?: MergeProfilesResult; error?: string }> {
  const { keepProfileId, mergeProfileId, actorUserId } = options;

  if (keepProfileId === mergeProfileId) {
    return { error: "Choose two different accounts to merge." };
  }

  if (mergeProfileId === actorUserId) {
    return { error: "You cannot merge away the account you are signed in with." };
  }

  const [{ data: keepProfile }, { data: mergeProfile }] = await Promise.all([
    service.from("profiles").select("*").eq("id", keepProfileId).maybeSingle(),
    service.from("profiles").select("*").eq("id", mergeProfileId).maybeSingle(),
  ]);

  if (!keepProfile || !mergeProfile) {
    return { error: "One of the selected accounts was not found." };
  }

  const primary = keepProfile as Profile;
  const secondary = mergeProfile as Profile;
  const primaryEmail = normalizeEmail(primary.email);
  const secondaryEmail = normalizeEmail(secondary.email);

  const preview = await previewVolunteerAssignments(service, secondary);
  const handledSeparately = new Set(["volunteer_records", "trap_team_membership"]);
  const assignmentPreview = {
    ...preview,
    groups: preview.groups.filter((group) => !handledSeparately.has(group.key)),
    hasAssignments: preview.groups.some((group) => !handledSeparately.has(group.key)),
  };
  const decisions = buildMergeDecisions(assignmentPreview, primary.id);

  if (assignmentPreview.hasAssignments) {
    const applyError = await applyVolunteerAssignmentDecisions(
      service,
      assignmentPreview,
      decisions
    );
    if (applyError) return { error: applyError };
  }

  await reassignTrapTeamMembership(service, secondaryEmail, primaryEmail);

  const appError = await mergeVolunteerApplications(service, primaryEmail, secondaryEmail);
  if (appError) return { error: appError };

  const { error: roleReqError } = await service
    .from("volunteer_role_requests")
    .update({ profile_id: primary.id, email: primary.email })
    .or(`email.ilike.${secondaryEmail},profile_id.eq.${secondary.id}`);
  if (roleReqError) return { error: roleReqError.message };

  // Move any aliases already on the secondary account.
  await service
    .from("profile_email_aliases")
    .update({ profile_id: primary.id })
    .eq("profile_id", secondary.id);

  const aliasError = await addEmailAlias(service, primary.id, secondary.email);
  if (aliasError) return { error: aliasError };

  const fieldError = await mergeProfileFields(service, primary, secondary);
  if (fieldError) return { error: fieldError };

  await service.from("profiles").update({ team_id: null }).eq("id", secondary.id);

  const removeError = await removeVolunteerUser(service, secondary.id);
  if (removeError) return { error: removeError };

  return {
    result: {
      keptProfileId: primary.id,
      mergedProfileId: secondary.id,
      keptEmail: primary.email,
      aliasEmail: secondary.email,
      transferredGroups: preview.groups.map((group) => group.key),
    },
  };
}
