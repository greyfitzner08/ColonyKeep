"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  shouldShowVolunteerApplicationsIndicator,
  type VolunteerApplicationsActivity,
} from "@/lib/volunteers/activity";
import { getVolunteerApplicationsLastSeen } from "@/lib/volunteers/last-seen";

export function useVolunteerApplicationsNavIndicator(
  activity: VolunteerApplicationsActivity | null,
  profileId: string | undefined
) {
  const pathname = usePathname();
  const isOnVolunteersPage = pathname === "/volunteers" || pathname.startsWith("/volunteers/");
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      setLastSeenAt(null);
      return;
    }

    setLastSeenAt(getVolunteerApplicationsLastSeen(profileId));

    function handleSeen(event: Event) {
      const detail = (event as CustomEvent<{ profileId: string; seenAt: string }>).detail;
      if (detail?.profileId === profileId) {
        setLastSeenAt(detail.seenAt);
      }
    }

    window.addEventListener("volunteer-applications-seen", handleSeen);
    return () => window.removeEventListener("volunteer-applications-seen", handleSeen);
  }, [profileId, pathname]);

  return shouldShowVolunteerApplicationsIndicator(activity, lastSeenAt, isOnVolunteersPage);
}
