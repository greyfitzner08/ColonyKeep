"use client";

import { Badge } from "@/components/ui/badge";
import type { VolunteerApplication } from "@/lib/types";
import { isTeamEligibleVolunteer } from "@/lib/volunteers/eligibility";

interface VolunteerEligibilityBadgesProps {
  application?: VolunteerApplication;
}

export function VolunteerEligibilityBadges({ application }: VolunteerEligibilityBadgesProps) {
  if (!application) {
    return <Badge variant="outline">No application on file</Badge>;
  }

  if (isTeamEligibleVolunteer(application)) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Team eligible</Badge>;
  }

  const missing: string[] = [];
  if (application.status !== "approved") missing.push("approved");
  if (!application.tnvr_certificate_uploaded) missing.push("TNVR cert");
  if (!application.shadow_completed) missing.push("field training");
  if (!application.liability_waiver_signed) missing.push("waiver");
  if (!application.policy_signed) missing.push("Policy Acknowledgement");

  return (
    <Badge variant="outline" className="text-orange-700 border-orange-200">
      Missing: {missing.join(", ")}
    </Badge>
  );
}
