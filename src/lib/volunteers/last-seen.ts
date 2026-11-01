const STORAGE_PREFIX = "volunteer-applications-last-seen";

function storageKey(profileId: string) {
  return `${STORAGE_PREFIX}:${profileId}`;
}

export function getVolunteerApplicationsLastSeen(profileId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(profileId));
  } catch {
    return null;
  }
}

export function markVolunteerApplicationsSeen(profileId: string, seenAt = new Date().toISOString()) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(profileId), seenAt);
    window.dispatchEvent(
      new CustomEvent("volunteer-applications-seen", { detail: { profileId, seenAt } })
    );
  } catch {
    // Ignore private browsing / storage quota errors.
  }
}
