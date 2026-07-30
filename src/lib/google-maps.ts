/** Server-only Google Maps API key for Places / Geocoding. */
export function getGoogleMapsApiKey(): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
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
