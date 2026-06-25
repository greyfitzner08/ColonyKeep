import { VOLUNTEER_ROLES } from "@/lib/constants";
import type { VolunteerRole } from "@/lib/types";

export interface HotspotMapVolunteer {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  volunteer_roles: VolunteerRole[];
  home_lat: number;
  home_lng: number;
}

export function volunteerRoleLabel(role: VolunteerRole): string {
  return VOLUNTEER_ROLES.find((entry) => entry.value === role)?.label ?? role.replace(/_/g, " ");
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
