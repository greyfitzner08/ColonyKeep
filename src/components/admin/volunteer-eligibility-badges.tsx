"use client";

import { Badge } from "@/components/ui/badge";
import type { Profile, VolunteerApplication } from "@/lib/types";
import {
  canAssignVolunteerToTeam,
  hasTrapTeamMemberRoles,
  hasTrapTeamSupportRoles,
  isTeamEligibleVolunteer,
  requiresTnvrTrainingForTrapTeam,
} from "@/lib/volunteers/eligibility";

interface VolunteerEligibilityBadgesProps {
  application?: VolunteerApplication;
  profile?: Pick<Profile, "volunteer_roles"> | null;
}

export function VolunteerEligibilityBadges({
  application,
  profile,
}: VolunteerEligibilityBadgesProps) {
  if (!application) {
    return <Badge variant="outline">No application on file</Badge>;
  }

  const trapTeamRole = hasTrapTeamMemberRoles(profile, application);
  const supportOnly = hasTrapTeamSupportRoles(profile, application) &&
    !requiresTnvrTrainingForTrapTeam(profile, application);

  if (!trapTeamRole) {
    if (application.status !== "approved") {
      return <Badge variant="outline">Not approved</Badge>;
    }

    return <Badge variant="outline">No trap team roles selected</Badge>;
  }

  if (isTeamEligibleVolunteer(application, profile)) {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        {supportOnly ? "Trap team eligible (support)" : "Trap team eligible"}
      </Badge>
    );
  }

  const missing: string[] = [];
  if (application.status !== "approved") missing.push("approved");
  if (requiresTnvrTrainingForTrapTeam(profile, application)) {
    if (!application.tnvr_certificate_uploaded) missing.push("TNVR cert");
    if (!application.shadow_completed) missing.push("field training");
  }

  if (missing.length === 0 && !canAssignVolunteerToTeam(application, profile)) {
    missing.push("requirements");
  }

  return (
    <Badge variant="outline" className="text-orange-700 border-orange-200">
      Missing: {missing.join(", ")}
    </Badge>
  );
}
