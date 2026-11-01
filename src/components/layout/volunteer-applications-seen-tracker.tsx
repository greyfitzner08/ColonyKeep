"use client";

import { useEffect } from "react";
import { markVolunteerApplicationsSeen } from "@/lib/volunteers/last-seen";

interface VolunteerApplicationsSeenTrackerProps {
  profileId: string;
}

export function VolunteerApplicationsSeenTracker({
  profileId,
}: VolunteerApplicationsSeenTrackerProps) {
  useEffect(() => {
    markVolunteerApplicationsSeen(profileId);
  }, [profileId]);

  return null;
}
