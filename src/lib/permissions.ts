import { isAdult } from "@/lib/volunteers/age-eligibility";
import type { Profile, UserRole } from "@/lib/types";

/**
 * Access tiers are driven by platform role only:
 * - admin
 * - inquiry_team
 * - trap_team_lead (TNVR)
 * - volunteer (same tools for every volunteer interest)
 *
 * Volunteer interests (trapper, event volunteer, etc.) are for staffing/labeling,
 * not for unlocking different pages.
 */

export interface ProfilePermissions {
  label: string;
  routes: string[];
  canEditCases: boolean;
  canViewIntakeQueue: boolean;
  canViewTrapQueue: boolean;
  canManageAppointments: boolean;
  canClaimShifts: boolean;
  canViewCommunityStats: boolean;
  canManageVolunteers: boolean;
  canManageClinics: boolean;
  canManageClinicEvents: boolean;
  canViewReports: boolean;
  canManageAdmin: boolean;
  canViewVolunteerDirectory: boolean;
}

/** @deprecated Interests no longer gate clinic access; kept for call-site compatibility. */
export function hasClinicCoordinationVolunteerRole(profile: Profile | null): boolean {
  return profile?.role === "admin";
}

export function canManageClinics(profile: Profile | null): boolean {
  return profile?.role === "admin";
}

export function canManageClinicEvents(profile: Profile | null): boolean {
  return canManageClinics(profile);
}

export function canManageCommunityPartners(profile: Profile | null): boolean {
  return profile?.role === "admin";
}

/** TNVR field tooling (equipment, etc.) — platform TNVR team or admin. */
export function hasTnvrVolunteerRole(profile: Profile | null): boolean {
  if (!profile?.role) return false;
  return profile.role === "admin" || profile.role === "trap_team_lead";
}

export function canManageTrapEquipment(profile: Profile | null): boolean {
  return hasTnvrVolunteerRole(profile);
}

/** Case queues — admin, inquiry, or TNVR platform roles only. */
export function isCaseWorker(profile: Profile | null): boolean {
  if (!profile?.role) return false;
  return (
    profile.role === "admin" ||
    profile.role === "inquiry_team" ||
    profile.role === "trap_team_lead"
  );
}

export function canManageAppointments(profile: Profile | null): boolean {
  if (!profile?.role) return false;
  return profile.role === "admin" || profile.role === "trap_team_lead";
}

export function canViewTrapTeamSection(profile: Profile | null): boolean {
  if (!profile?.role) return false;
  if (profile.role === "admin") return true;
  if (profile.role !== "trap_team_lead") return false;
  return Boolean(profile.team_id);
}

/** Every signed-in platform role can use Shift Board. */
export function canClaimShifts(profile: Profile | null): boolean {
  return Boolean(profile?.role);
}

export function canViewVolunteerDirectory(profile: Profile | null): boolean {
  if (!profile?.role) return false;
  if (profile.role === "admin") return true;
  return Boolean(profile.birthday && isAdult(profile.birthday));
}

export function getProfilePermissions(profile: Profile | null): ProfilePermissions | null {
  if (!profile?.role) return null;

  const role = profile.role;
  const caseWorker = isCaseWorker(profile);
  const appointments = canManageAppointments(profile);
  const shifts = canClaimShifts(profile);
  const volunteerDirectory = canViewVolunteerDirectory(profile);

  if (role === "admin") {
    return {
      label: "Administrator",
      routes: [
        "/",
        "/profile",
        "/intake",
        "/trap-queue",
        "/appointments",
        "/clinics",
        "/clinic-events",
        "/hotspots",
        "/volunteers",
        "/team-directory",
        "/shift-board",
        "/team-feed",
        "/my-impact",
        "/reports",
        "/admin",
        "/resources",
        "/equipment",
        "/community-partners",
      ],
      canEditCases: true,
      canViewIntakeQueue: true,
      canViewTrapQueue: true,
      canManageAppointments: true,
      canClaimShifts: true,
      canViewCommunityStats: true,
      canManageVolunteers: true,
      canManageClinics: true,
      canManageClinicEvents: true,
      canViewReports: true,
      canManageAdmin: true,
      canViewVolunteerDirectory: true,
    };
  }

  const routes = new Set<string>([
    "/",
    "/profile",
    "/team-feed",
    "/my-impact",
    "/resources",
    "/shift-board",
  ]);

  if (volunteerDirectory) {
    routes.add("/team-directory");
  }

  if (role === "inquiry_team") {
    routes.add("/intake");
    routes.add("/trap-queue");
    routes.add("/hotspots");
  }

  if (role === "trap_team_lead") {
    routes.add("/intake");
    routes.add("/trap-queue");
    routes.add("/hotspots");
    routes.add("/appointments");
    routes.add("/equipment");
  }

  const labels: Record<UserRole, string> = {
    admin: "Administrator",
    inquiry_team: "Inquiry Team",
    trap_team_lead: "TNVR Team",
    volunteer: "Volunteer",
  };

  return {
    label: labels[role] ?? "Volunteer",
    routes: Array.from(routes),
    canEditCases: caseWorker,
    canViewIntakeQueue: caseWorker,
    canViewTrapQueue: caseWorker,
    canManageAppointments: appointments,
    canClaimShifts: shifts,
    canViewCommunityStats: role === "volunteer",
    canManageVolunteers: false,
    canManageClinics: false,
    canManageClinicEvents: false,
    canViewReports: false,
    canManageAdmin: false,
    canViewVolunteerDirectory: volunteerDirectory,
  };
}

export function canAccessRoute(profile: Profile | null, pathname: string): boolean {
  if (!profile?.role) return false;

  if (pathname === "/team-directory" || pathname.startsWith("/team-directory/")) {
    return canViewVolunteerDirectory(profile);
  }

  if (pathname === "/community-partners" || pathname.startsWith("/community-partners/")) {
    return canManageCommunityPartners(profile);
  }

  const permissions = getProfilePermissions(profile);
  if (!permissions) return false;

  if (pathname.startsWith("/case/")) {
    return permissions.canEditCases;
  }

  return permissions.routes.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`))
  );
}

export function documentVisibleToProfile(
  viewRoles: string[],
  profile: Profile | null,
  section?: string
): boolean {
  if (!profile?.role) return false;
  if (profile.role === "admin") return true;
  if (section === "Volunteer Onboarding") return true;
  if (viewRoles.includes(profile.role)) return true;
  return false;
}
