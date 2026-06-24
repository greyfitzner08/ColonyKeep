import type { Profile, VolunteerApplication, VolunteerRole, VolunteerRoleRequest } from "@/lib/types";
import type { RequirementField } from "@/lib/volunteers/role-requirements";
import { missingRequirementsForRole } from "@/lib/volunteers/role-requirements";
import { volunteerRequirementSource } from "@/lib/volunteers/requirement-source";
import type { SupabaseClient } from "@supabase/supabase-js";

export function mergeVolunteerRoles(
  current: VolunteerRole[],
  additions: VolunteerRole[]
): VolunteerRole[] {
  return Array.from(new Set([...current, ...additions]));
}

export function requirementSourceForRoleRequest(
  application: VolunteerApplication | null,
  profile: Pick<Profile, "volunteer_roles" | "tnvr_certificate_uploaded" | "tnvr_certificate_url"> | null,
  roleRequest: Pick<
    VolunteerRoleRequest,
    | RequirementField
    | "tnvr_certificate_url"
  >
): Pick<VolunteerApplication, RequirementField> {
  const base = volunteerRequirementSource(application, {
    tnvr_certificate_uploaded: profile?.tnvr_certificate_uploaded ?? false,
    tnvr_certificate_url: profile?.tnvr_certificate_url ?? null,
  });

  return {
    liability_waiver_signed:
      roleRequest.liability_waiver_signed || base.liability_waiver_signed,
    policy_signed: roleRequest.policy_signed || base.policy_signed,
    shadow_completed: roleRequest.shadow_completed || base.shadow_completed,
    intake_training: roleRequest.intake_training || base.intake_training,
    tnvr_certificate_uploaded:
      roleRequest.tnvr_certificate_uploaded || base.tnvr_certificate_uploaded,
    event_crash_course: roleRequest.event_crash_course || base.event_crash_course,
  };
}

export function partitionRolesByRequirements(
  roles: VolunteerRole[],
  source: Pick<VolunteerApplication, RequirementField>
): { ready: VolunteerRole[]; pending: VolunteerRole[] } {
  const ready: VolunteerRole[] = [];
  const pending: VolunteerRole[] = [];

  for (const role of roles) {
    if (missingRequirementsForRole(role, source).length === 0) {
      ready.push(role);
    } else {
      pending.push(role);
    }
  }

  return { ready, pending };
}

export function pendingNewRoles(
  application: VolunteerApplication,
  approvedRoles: VolunteerRole[]
): VolunteerRole[] {
  return (application.roles_requested ?? []).filter((role) => !approvedRoles.includes(role));
}

export async function syncApplicationForRoleRequests(
  service: SupabaseClient,
  email: string,
  profile: Pick<Profile, "volunteer_roles" | "tnvr_certificate_uploaded" | "tnvr_certificate_url">
) {
  const { data: application } = await service
    .from("volunteer_applications")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!application) return;

  const { data: pendingAdds } = await service
    .from("volunteer_role_requests")
    .select("requested_roles")
    .eq("email", email.toLowerCase())
    .eq("status", "pending")
    .eq("request_type", "add");

  const approvedRoles = (profile.volunteer_roles ?? []) as VolunteerRole[];
  const requestedRoles = Array.from(
    new Set((pendingAdds ?? []).flatMap((entry) => entry.requested_roles as VolunteerRole[]))
  );
  const newRoles = requestedRoles.filter((role) => !approvedRoles.includes(role));

  if (newRoles.length === 0) {
    if (application.status !== "approved") {
      await service
        .from("volunteer_applications")
        .update({
          status: "approved",
          roles_requested: approvedRoles,
        })
        .eq("id", application.id);
    }
    return;
  }

  const source = volunteerRequirementSource(application as VolunteerApplication, profile);
  const { pending } = partitionRolesByRequirements(newRoles, source);

  await service
    .from("volunteer_applications")
    .update({
      status: pending.length > 0 ? "needs_followup" : "pending",
      roles_requested: newRoles,
      tnvr_certificate_uploaded:
        application.tnvr_certificate_uploaded || profile.tnvr_certificate_uploaded || false,
      tnvr_certificate_url:
        application.tnvr_certificate_url ?? profile.tnvr_certificate_url ?? null,
    })
    .eq("id", application.id);
}

export async function markApplicationApprovedAfterRoleGrant(
  service: SupabaseClient,
  email: string,
  volunteerRoles: VolunteerRole[]
) {
  const { data: application } = await service
    .from("volunteer_applications")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!application) return;

  const { count: pendingCount } = await service
    .from("volunteer_role_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", email.toLowerCase())
    .eq("status", "pending");

  if ((pendingCount ?? 0) > 0) return;

  await service
    .from("volunteer_applications")
    .update({
      status: "approved",
      roles_requested: volunteerRoles,
    })
    .eq("id", application.id);
}
