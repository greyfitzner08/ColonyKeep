import type { Profile, VolunteerApplication } from "@/lib/types";
import type { RequirementField } from "@/lib/volunteers/role-requirements";

/** Merge application + profile fields for requirement checks. */
export function volunteerRequirementSource(
  application: VolunteerApplication | null,
  profile: Pick<Profile, "tnvr_certificate_uploaded" | "tnvr_certificate_url">
): Pick<VolunteerApplication, RequirementField> {
  return {
    liability_waiver_signed: application?.liability_waiver_signed ?? false,
    policy_signed: application?.policy_signed ?? false,
    shadow_completed: application?.shadow_completed ?? false,
    intake_training: application?.intake_training ?? false,
    tnvr_certificate_uploaded:
      application?.tnvr_certificate_uploaded ?? profile.tnvr_certificate_uploaded ?? false,
    event_crash_course: application?.event_crash_course ?? false,
  };
}
