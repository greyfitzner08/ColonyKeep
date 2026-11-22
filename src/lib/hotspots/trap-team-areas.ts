import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeZip } from "@/lib/cases/assign-team-by-zip";

export const TRAP_TEAM_LAYER_COLORS = [
  "#6d28d9",
  "#1d4ed8",
  "#0f766e",
  "#15803d",
  "#a16207",
  "#be185d",
  "#4338ca",
  "#c2410c",
] as const;

const CENSUS_ZCTA_QUERY =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query";

export interface MapTrapTeam {
  id: string;
  name: string;
  color: string;
  zipCodes: string[];
  mappedZipCodes: string[];
  unmappedZipCodes: string[];
}

export interface TrapTeamZipFeature {
  type: "Feature";
  properties: {
    zip: string;
    teamId: string;
    teamName: string;
    color: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface TrapTeamAreas {
  teams: MapTrapTeam[];
  features: TrapTeamZipFeature[];
  error: string | null;
}

interface CensusFeature {
  properties?: { ZCTA5?: string };
  geometry?: {
    type?: string;
    coordinates?: number[][][] | number[][][][];
  };
}

function uniqueZips(zipCodes: string[]): string[] {
  const seen = new Set<string>();
  const zips: string[] = [];
  for (const entry of zipCodes) {
    const zip = normalizeZip(entry);
    if (zip.length !== 5 || seen.has(zip)) continue;
    seen.add(zip);
    zips.push(zip);
  }
  return zips;
}

async function fetchZctaBatch(
  zips: string[]
): Promise<Map<string, TrapTeamZipFeature["geometry"]>> {
  const where = `ZCTA5 IN (${zips.map((zip) => `'${zip}'`).join(",")})`;
  const url = new URL(CENSUS_ZCTA_QUERY);
  url.searchParams.set("where", where);
  url.searchParams.set("outFields", "ZCTA5");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "geojson");
  url.searchParams.set("maxAllowableOffset", "0.0015");
  url.searchParams.set("geometryPrecision", "5");

  const response = await fetch(url, { next: { revalidate: 86_400 } });
  if (!response.ok) {
    throw new Error(`ZIP boundaries returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    error?: { message?: string };
    features?: CensusFeature[];
  };
  if (payload.error) {
    throw new Error(payload.error.message || "ZIP boundaries could not be loaded");
  }

  const byZip = new Map<string, TrapTeamZipFeature["geometry"]>();
  for (const feature of payload.features ?? []) {
    const zip = feature.properties?.ZCTA5?.trim();
    const geometry = feature.geometry;
    if (!zip || (geometry?.type !== "Polygon" && geometry?.type !== "MultiPolygon")) continue;
    if (!geometry.coordinates) continue;
    byZip.set(zip, {
      type: geometry.type,
      coordinates: geometry.coordinates,
    });
  }
  return byZip;
}

async function fetchZctaFeatures(
  zips: string[]
): Promise<Map<string, TrapTeamZipFeature["geometry"]>> {
  const byZip = new Map<string, TrapTeamZipFeature["geometry"]>();
  for (let index = 0; index < zips.length; index += 40) {
    const batch = await fetchZctaBatch(zips.slice(index, index + 40));
    for (const [zip, geometry] of batch) byZip.set(zip, geometry);
  }
  return byZip;
}

export async function loadTrapTeamAreas(supabase: SupabaseClient): Promise<TrapTeamAreas> {
  const { data, error } = await supabase
    .from("trap_teams")
    .select("id, name, zip_codes, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return { teams: [], features: [], error: error.message };
  }

  const teamsWithZips = (
    (data ?? []) as Array<{ id: string; name: string | null; zip_codes: string[] | null }>
  )
    .map((team) => ({
      id: team.id,
      name: team.name?.trim() || "Trap team",
      zipCodes: uniqueZips(team.zip_codes ?? []),
    }))
    .filter((team) => team.zipCodes.length > 0 && team.name.toLowerCase() !== "trap school")
    .map((team, index) => ({
      ...team,
      color: TRAP_TEAM_LAYER_COLORS[index % TRAP_TEAM_LAYER_COLORS.length],
    }));

  if (teamsWithZips.length === 0) {
    return { teams: [], features: [], error: null };
  }

  let geometries: Map<string, TrapTeamZipFeature["geometry"]>;
  try {
    geometries = await fetchZctaFeatures(teamsWithZips.flatMap((team) => team.zipCodes));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "ZIP boundaries could not be loaded";
    return {
      teams: teamsWithZips.map((team) => ({
        ...team,
        mappedZipCodes: [],
        unmappedZipCodes: team.zipCodes,
      })),
      features: [],
      error: message,
    };
  }

  const claimed = new Set<string>();
  const features: TrapTeamZipFeature[] = [];
  const teams: MapTrapTeam[] = teamsWithZips.map((team) => {
    const mappedZipCodes: string[] = [];
    const unmappedZipCodes: string[] = [];
    for (const zip of team.zipCodes) {
      const geometry = geometries.get(zip);
      if (!geometry) {
        unmappedZipCodes.push(zip);
        continue;
      }
      if (claimed.has(zip)) continue;
      claimed.add(zip);
      mappedZipCodes.push(zip);
      features.push({
        type: "Feature",
        properties: {
          zip,
          teamId: team.id,
          teamName: team.name,
          color: team.color,
        },
        geometry,
      });
    }
    return { ...team, mappedZipCodes, unmappedZipCodes };
  });

  return { teams, features, error: null };
}
