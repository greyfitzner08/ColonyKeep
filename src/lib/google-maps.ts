/**
 * Server-only Google Maps API key for Places Autocomplete/Details and Geocoding.
 *
 * Prefer GOOGLE_MAPS_SERVER_API_KEY: a key with no HTTP referrer restrictions
 * (API restrictions to Places + Geocoding only). Browser keys with referrer
 * restrictions cannot be used from Next.js API routes.
 */
export function getGoogleMapsApiKey(): string | null {
  const key = (
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
  if (!key) return null;
  if (
    key.includes("your-google") ||
    key.includes("your_api") ||
    key === "your-google-maps-api-key"
  ) {
    return null;
  }
  return key;
}

export function getGoogleMapsApiKeySource(): "GOOGLE_MAPS_SERVER_API_KEY" | "GOOGLE_MAPS_API_KEY" | null {
  if (process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim()) return "GOOGLE_MAPS_SERVER_API_KEY";
  if (process.env.GOOGLE_MAPS_API_KEY?.trim()) return "GOOGLE_MAPS_API_KEY";
  return null;
}

/** Friendlier message when Google rejects a browser-restricted key on the server. */
export function formatGoogleMapsApiError(
  status: string | undefined,
  errorMessage: string | undefined,
  options?: { key?: string | null; source?: string | null }
): string {
  const message = (errorMessage ?? "").trim();
  const key = options?.key?.trim() ?? "";
  const source = options?.source ?? getGoogleMapsApiKeySource();
  const suffix = key.length >= 4 ? key.slice(-4) : "????";
  const which = source ? `${source} (…${suffix})` : `key …${suffix}`;

  if (/referer restrictions|referrer restrictions/i.test(message)) {
    return (
      `Address suggestions failed: ${which} is locked to websites (HTTP referrers). ` +
      "In Vercel, set BOTH GOOGLE_MAPS_SERVER_API_KEY and GOOGLE_MAPS_API_KEY to your unrestricted server key " +
      "(Application restrictions = None), then Redeploy. GOOGLE_MAPS_SERVER_API_KEY is used first if present."
    );
  }
  if (message) return `${message} [${which}]`;
  return `Google Places autocomplete failed (${status ?? "unknown"}) [${which}]. Check the API key and enable Places API.`;
}

