"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  shouldShowAdoptionApplicationsIndicator,
  type AdoptionApplicationsActivity,
} from "@/lib/adoption/activity";
import { getAdoptionApplicationsLastSeen } from "@/lib/adoption/last-seen";

export function useAdoptionApplicationsNavIndicator(
  activity: AdoptionApplicationsActivity | null,
  profileId: string | undefined
) {
  const pathname = usePathname();
  const isOnApplicationsPage =
    pathname === "/adoption/applications" || pathname.startsWith("/adoption/applications/");
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      setLastSeenAt(null);
      return;
    }

    setLastSeenAt(getAdoptionApplicationsLastSeen(profileId));

    function handleSeen(event: Event) {
      const detail = (event as CustomEvent<{ profileId: string; seenAt: string }>).detail;
      if (detail?.profileId === profileId) {
        setLastSeenAt(detail.seenAt);
      }
    }

    window.addEventListener("adoption-applications-seen", handleSeen);
    return () => window.removeEventListener("adoption-applications-seen", handleSeen);
  }, [profileId, pathname]);

  return shouldShowAdoptionApplicationsIndicator(activity, lastSeenAt, isOnApplicationsPage);
}
