"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  shouldShowTeamFeedIndicator,
  type TeamFeedActivity,
} from "@/lib/team-feed/activity";
import { getTeamFeedLastSeen } from "@/lib/team-feed/last-seen";

export function useTeamFeedNavIndicator(
  activity: TeamFeedActivity | null,
  profileId: string | undefined
) {
  const pathname = usePathname();
  const isOnTeamFeedPage = pathname.startsWith("/team-feed");
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      setLastSeenAt(null);
      return;
    }

    setLastSeenAt(getTeamFeedLastSeen(profileId));

    function handleSeen(event: Event) {
      const detail = (event as CustomEvent<{ profileId: string; seenAt: string }>).detail;
      if (detail?.profileId === profileId) {
        setLastSeenAt(detail.seenAt);
      }
    }

    window.addEventListener("team-feed-seen", handleSeen);
    return () => window.removeEventListener("team-feed-seen", handleSeen);
  }, [profileId, pathname]);

  return shouldShowTeamFeedIndicator(activity, lastSeenAt, isOnTeamFeedPage);
}
