import { TNVR_ROLES } from "@/lib/constants";
import type { Profile, UserRole, VolunteerRole } from "@/lib/types";

/** Volunteer interests that can sign up for event/shift board slots. */
export const SHIFT_ELIGIBLE_VOLUNTEER_ROLES: VolunteerRole[] = [
  "intake_representative",
  "trapper",
  "trap_loaner",
  "transporter",
  "recovery",
  "event_volunteer",
  "grant_writing",
  "social_media",
  "story_writer",
  "snack_patrol",
  "crafter",
  "photographer",
  "videographer",
  "community_outreach",
  "youth_volunteer",
];

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
  canViewTeamDashboard: boolean;
}

function volunteerRoles(profile: Profile): VolunteerRole[] {
  return profile.volunteer_roles ?? [];
}

function hasVolunteerRole(profile: Profile, roles: VolunteerRole[]): boolean {
  const mine = volunteerRoles(profile);
  return roles.some((role) => mine.includes(role));
}

function hasTnvrVolunteerRole(profile: Profile): boolean {
  return hasVolunteerRole(profile, TNVR_ROLES);
}

export function isCaseWorker(profile: Profile | null): boolean {
  if (!profile?.role) return false;
  if (profile.role === "admin") return true;
  if (profile.role === "inquiry_team" || profile.role === "trap_team_lead") return true;
  if (hasVolunteerRole(profile, ["intake_representative"])) return true;
  if (hasTnvrVolunteerRole(profile)) return true;
  return false;
}

export function canManageAppointments(profile: Profile | null): boolean {
  if (!profile?.role) return false;
  if (profile.role === "admin") return true;
  if (profile.role === "trap_team_lead" || profile.role === "clinic_coordination") return true;
  if (hasTnvrVolunteerRole(profile)) return true;
  return false;
}

export function canViewTeamDashboard(profile: Profile | null): boolean {
  if (!profile?.role) return false;
  if (profile.role === "admin") return true;
  if (!profile.team_id) return false;
  if (profile.role === "trap_team_lead") return true;
  return hasTnvrVolunteerRole(profile);
}

export function canClaimShifts(profile: Profile | null): boolean {
  if (!profile?.role) return false;
  if (profile.role === "admin") return true;
  if (profile.role === "inquiry_team" || profile.role === "trap_team_lead") return true;
  if (profile.role === "clinic_coordination") return true;
  return hasVolunteerRole(profile, SHIFT_ELIGIBLE_VOLUNTEER_ROLES);
}

export function getProfilePermissions(profile: Profile | null): ProfilePermissions | null {
  if (!profile?.role) return null;

  const role = profile.role;
  const caseWorker = isCaseWorker(profile);
  const appointments = canManageAppointments(profile);
  const shifts = canClaimShifts(profile);
  const teamDashboard = canViewTeamDashboard(profile);

  if (role === "admin") {
    return {
      label: "Administrator",
      routes: [
        "/",
        "/intake",
        "/trap-queue",
        "/appointments",
        "/clinics",
        "/clinic-events",
        "/hotspots",
        "/volunteers",
        "/shift-board",
        "/team-feed",
        "/team-dashboard",
        "/my-impact",
        "/reports",
        "/admin",
        "/resources",
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
      canViewTeamDashboard: true,
    };
  }

  const routes = new Set<string>(["/", "/team-feed", "/my-impact", "/resources"]);

  if (caseWorker) {
    routes.add("/intake");
    routes.add("/trap-queue");
    routes.add("/hotspots");
  }

  if (appointments) {
    routes.add("/appointments");
  }

  if (role === "clinic_coordination") {
    routes.add("/clinics");
    routes.add("/clinic-events");
  }

  if (shifts) {
    routes.add("/shift-board");
  }

  if (teamDashboard) {
    routes.add("/team-dashboard");
  }

  if (!caseWorker) {
    routes.add("/"); // dashboard with community stats
  }

  const labels: Record<UserRole, string> = {
    admin: "Administrator",
    inquiry_team: "Inquiry Team",
    trap_team_lead: "Trap Team Lead",
    clinic_coordination: "Clinic Coordination",
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
    canViewCommunityStats: !caseWorker || role === "volunteer",
    canManageVolunteers: false,
    canManageClinics: role === "clinic_coordination",
    canManageClinicEvents: role === "clinic_coordination",
    canViewReports: false,
    canManageAdmin: false,
    canViewTeamDashboard: teamDashboard,
  };
}

export function canAccessRoute(profile: Profile | null, pathname: string): boolean {
  if (!profile?.role) return false;

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
  viewRoles: UserRole[],
  profile: Profile | null,
  section?: string
): boolean {
  if (!profile?.role) return false;
  if (profile.role === "admin") return true;
  if (section === "Volunteer Onboarding") return true;
  return viewRoles.includes(profile.role);
}
