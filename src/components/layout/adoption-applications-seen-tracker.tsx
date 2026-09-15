"use client";

import { useEffect } from "react";
import { markAdoptionApplicationsSeen } from "@/lib/adoption/last-seen";

interface AdoptionApplicationsSeenTrackerProps {
  profileId: string;
}

export function AdoptionApplicationsSeenTracker({ profileId }: AdoptionApplicationsSeenTrackerProps) {
  useEffect(() => {
    markAdoptionApplicationsSeen(profileId);
  }, [profileId]);

  return null;
}
