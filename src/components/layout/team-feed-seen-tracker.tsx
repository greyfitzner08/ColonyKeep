"use client";

import { useEffect } from "react";
import { markTeamFeedSeen } from "@/lib/team-feed/last-seen";

interface TeamFeedSeenTrackerProps {
  profileId: string;
}

export function TeamFeedSeenTracker({ profileId }: TeamFeedSeenTrackerProps) {
  useEffect(() => {
    markTeamFeedSeen(profileId);
  }, [profileId]);

  return null;
}
