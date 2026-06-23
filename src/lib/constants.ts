import type {
  HelpRequestStatus,
  UserRole,
  VolunteerRole,
} from "@/lib/types";

export const CASE_STATUSES: { value: HelpRequestStatus; label: string }[] = [
  { value: "new_intake", label: "New Intake" },
  { value: "under_review", label: "Under Review" },
  { value: "needs_more_info", label: "Needs More Info" },
  { value: "routed_to_trap_team", label: "Routed to Trap Team" },
  { value: "claimed", label: "Claimed" },
  { value: "appointment_needed", label: "Appointment Needed" },
  { value: "appointment_reserved", label: "Appointment Reserved" },
  { value: "cat_trapped", label: "Cat Trapped" },
  { value: "transported", label: "Transported" },
  { value: "checked_in", label: "Checked In" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

export const TNVR_ROLES: VolunteerRole[] = [
  "trapper",
  "trap_loaner",
  "transporter",
  "recovery",
];

export const VOLUNTEER_ROLES: { value: VolunteerRole; label: string }[] = [
  { value: "intake_representative", label: "Intake Representative" },
  { value: "trapper", label: "Trapper" },
  { value: "trap_loaner", label: "Trap Loaner" },
  { value: "transporter", label: "Transporter" },
  { value: "recovery", label: "Recovery Space Provider" },
  { value: "event_volunteer", label: "Event Volunteer" },
  { value: "grant_writing", label: "Grant Writing" },
  { value: "social_media", label: "Social Media" },
  { value: "snack_patrol", label: "Snack Patrol" },
  { value: "crafter", label: "Crafter" },
  { value: "story_writer", label: "Story Writer" },
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "community_outreach", label: "Community Outreach" },
  { value: "other", label: "Other" },
];

export const MEDICAL_KEYWORDS = [
  "injured",
  "injury",
  "sick",
  "ill",
  "bleeding",
  "wound",
  "limping",
  "emaciated",
  "dying",
  "dying",
  "emergency",
  "urgent",
  "infected",
  "abscess",
  "respiratory",
  "eye infection",
  "mange",
  "paralyzed",
];

export const LIABILITY_WAIVER_URL =
  "https://www.notion.so/placeholder-liability-waiver";
export const POLICY_URL =
  "https://zealous-sherbet-f24.notion.site/Core-Policies-309a52ca229f817381b3cb6b68e5fadb";

export const ROLE_PERMISSIONS: Record<
  UserRole,
  { routes: string[]; label: string }
> = {
  admin: {
    label: "Administrator",
    routes: [
      "/",
      "/intake",
      "/trap-queue",
      "/appointments",
      "/clinics",
      "/hotspots",
      "/volunteers",
      "/shift-board",
      "/team-feed",
      "/team-dashboard",
      "/my-impact",
      "/reports",
      "/admin",
      "/clinic-events",
    ],
  },
  inquiry_team: {
    label: "Inquiry Team",
    routes: [
      "/",
      "/intake",
      "/case",
      "/hotspots",
      "/shift-board",
      "/team-feed",
      "/my-impact",
    ],
  },
  trap_team_lead: {
    label: "Trap Team Lead",
    routes: [
      "/",
      "/intake",
      "/case",
      "/trap-queue",
      "/appointments",
      "/hotspots",
      "/shift-board",
      "/team-feed",
      "/team-dashboard",
      "/my-impact",
    ],
  },
  clinic_coordination: {
    label: "Clinic Coordination",
    routes: [
      "/",
      "/intake",
      "/case",
      "/appointments",
      "/clinics",
      "/clinic-events",
      "/shift-board",
      "/team-feed",
      "/my-impact",
    ],
  },
  volunteer: {
    label: "Volunteer",
    routes: [
      "/",
      "/trap-queue",
      "/shift-board",
      "/team-feed",
      "/my-impact",
    ],
  },
};

export function isKnownUserRole(role: string | null | undefined): role is UserRole {
  return role != null && role in ROLE_PERMISSIONS;
}

export function getRolePermissions(role: string | null | undefined) {
  return isKnownUserRole(role) ? ROLE_PERMISSIONS[role] : null;
}

export const STATUS_COLORS: Record<HelpRequestStatus, string> = {
  new_intake: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  needs_more_info: "bg-orange-100 text-orange-800",
  routed_to_trap_team: "bg-purple-100 text-purple-800",
  claimed: "bg-indigo-100 text-indigo-800",
  appointment_needed: "bg-pink-100 text-pink-800",
  appointment_reserved: "bg-cyan-100 text-cyan-800",
  cat_trapped: "bg-teal-100 text-teal-800",
  transported: "bg-sky-100 text-sky-800",
  checked_in: "bg-lime-100 text-lime-800",
  completed: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  reserved: "bg-yellow-100 text-yellow-800",
  confirmed_transport: "bg-blue-100 text-blue-800",
  checked_in: "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};
