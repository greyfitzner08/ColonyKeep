const STORAGE_PREFIX = "team-feed-last-seen";

function storageKey(profileId: string) {
  return `${STORAGE_PREFIX}:${profileId}`;
}

export function getTeamFeedLastSeen(profileId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(profileId));
  } catch {
    return null;
  }
}

export function markTeamFeedSeen(profileId: string, seenAt = new Date().toISOString()) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(profileId), seenAt);
    window.dispatchEvent(new CustomEvent("team-feed-seen", { detail: { profileId, seenAt } }));
  } catch {
    // Ignore private browsing / storage quota errors.
  }
}
