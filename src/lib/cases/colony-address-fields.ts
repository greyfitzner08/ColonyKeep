import type { HelpRequest } from "@/lib/types";

export const COLONY_ADDRESS_UPDATE_FIELDS = [
  "colony_address",
  "colony_city",
  "colony_state",
  "colony_zip",
  "colony_county",
  "colony_lat",
  "colony_lng",
  "assigned_team_id",
  "assigned_team_name",
  "assigned_team",
] as const;

export function colonyAddressPayload(
  hr: Pick<
    HelpRequest,
    | "colony_address"
    | "colony_city"
    | "colony_state"
    | "colony_zip"
    | "colony_county"
    | "colony_lat"
    | "colony_lng"
    | "assigned_team_id"
    | "assigned_team_name"
  > & { assigned_team?: string | null }
) {
  return {
    colony_address: hr.colony_address,
    colony_city: hr.colony_city,
    colony_state: hr.colony_state,
    colony_zip: hr.colony_zip,
    colony_county: hr.colony_county,
    colony_lat: hr.colony_lat,
    colony_lng: hr.colony_lng,
    assigned_team_id: hr.assigned_team_id,
    assigned_team_name: hr.assigned_team_name,
    assigned_team: hr.assigned_team ?? hr.assigned_team_name,
  };
}

export function hasStoredColonyCoords(
  hr: Pick<HelpRequest, "colony_lat" | "colony_lng">
) {
  return hr.colony_lat != null && hr.colony_lng != null;
}
