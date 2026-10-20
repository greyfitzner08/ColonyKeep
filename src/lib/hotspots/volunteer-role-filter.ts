import { VOLUNTEER_ROLES } from "@/lib/constants";
import type { VolunteerRole } from "@/lib/types";

/** Roles that are not useful for locating nearby field help on the hotspots map. */
const HIDDEN_HOTSPOT_VOLUNTEER_ROLES = new Set<VolunteerRole>([
  "photographer",
  "snack_patrol",
  "social_media",
  "story_writer",
  "crafter",
  "grant_writing",
]);

export const HOTSPOT_VOLUNTEER_ROLES = VOLUNTEER_ROLES.filter(
  (role) => !HIDDEN_HOTSPOT_VOLUNTEER_ROLES.has(role.value)
);

export function isHotspotVolunteerRole(role: VolunteerRole): boolean {
  return !HIDDEN_HOTSPOT_VOLUNTEER_ROLES.has(role);
}

export interface HotspotMapVolunteer {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  volunteer_roles: VolunteerRole[];
  home_lat: number;
  home_lng: number;
  phone?: string | null;
  address?: string | null;
}

export function volunteerRoleLabel(role: VolunteerRole): string {
  return VOLUNTEER_ROLES.find((entry) => entry.value === role)?.label ?? role.replace(/_/g, " ");
}

export function hotspotVolunteerRoles(roles: VolunteerRole[]): VolunteerRole[] {
  return roles.filter(isHotspotVolunteerRole);
}

export function volunteerMatchesRoleFilter(
  volunteer: Pick<HotspotMapVolunteer, "volunteer_roles">,
  selectedRoles: VolunteerRole[]
): boolean {
  if (selectedRoles.length === 0) return true;
  if (volunteer.volunteer_roles.length === 0) return false;
  return volunteer.volunteer_roles.some((role) => selectedRoles.includes(role));
}

export function filterHotspotVolunteersByRole(
  volunteers: HotspotMapVolunteer[],
  selectedRoles: VolunteerRole[]
): HotspotMapVolunteer[] {
  return volunteers.filter((volunteer) => volunteerMatchesRoleFilter(volunteer, selectedRoles));
}
