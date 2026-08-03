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

/** Friendlier message when Google rejects a browser-restricted key on the server. */
export function formatGoogleMapsApiError(
  status: string | undefined,
  errorMessage: string | undefined
): string {
  const message = (errorMessage ?? "").trim();
  if (/referer restrictions|referrer restrictions/i.test(message)) {
    return (
      "Address suggestions need a server Google Maps API key (no HTTP referrer restrictions). " +
      "Create a key in Google Cloud limited to Places API + Geocoding API, set it as " +
      "GOOGLE_MAPS_SERVER_API_KEY in Vercel and .env.local, then redeploy."
    );
  }
  if (message) return message;
  return `Google Places autocomplete failed (${status ?? "unknown"}). Check the API key and enable Places API.`;
}

