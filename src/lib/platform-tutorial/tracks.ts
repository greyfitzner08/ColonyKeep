import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  Compass,
  Heart,
  Kanban,
  Map,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import type { ProfilePermissions } from "@/lib/permissions";
import { getProfilePermissions } from "@/lib/permissions";
import { APPOINTMENTS_UI_ENABLED, SHIFT_SIGNUPS_UI_ENABLED } from "@/lib/features";
import type { PlatformTutorialStep } from "@/lib/platform-tutorial/steps";
import type { Profile, UserRole } from "@/lib/types";

export type TutorialMode = "quick" | "advanced";

export interface AdvancedTutorialTrack {
  id: string;
  title: string;
  summary: string;
  roleLabel: string;
  steps: PlatformTutorialStep[];
}

function step(
  partial: Omit<PlatformTutorialStep, "icon"> & { icon: LucideIcon }
): PlatformTutorialStep {
  return partial;
}

const ADMIN_TRACK: AdvancedTutorialTrack = {
  id: "admin",
  title: "Admin operations flow",
  summary:
    "How people, cases, clinics, and events connect — and where you configure each piece.",
  roleLabel: "Administrator",
  steps: [
    step({
      id: "adv-admin-welcome",
      title: "Your role as administrator",
      description:
        "You see every module. This advanced walkthrough follows the operational path: people → cases → clinics → events → reporting.",
      icon: Sparkles,
    }),
    step({
      id: "adv-admin-people",
      title: "Start with people",
      description:
        "Approve volunteer applications and assign platform roles in Volunteers. Pending role-change requests can be minimized or snoozed for the day when the list is long. Platform role controls which pages someone can open.",
      icon: Users,
      navHref: "/volunteers",
      flowNote: "Platform role unlocks Trap Queue, Clinics, etc. Interests are for staffing only.",
    }),
    step({
      id: "adv-admin-intake",
      title: "Cases land in the Trap Queue",
      description:
        "Public inquiry forms auto-assign by colony ZIP. Colonies with 5 or fewer cats/kittens get a Trap School tag. Configure the form intro and after-submit resource paths under Admin → Inquiry form custom fields.",
      icon: Kanban,
      navHref: "/trap-queue",
      flowNote: "Public form → ZIP team + Trap School tag → Trap Queue.",
    }),
    step({
      id: "adv-admin-trap",
      title: "Field work lives in the Trap Queue",
      description:
        "Teams switch between Unclaimed (oldest first, ready to claim) and My claims. The queue defaults to My claims when the user has active claims. Use Filters for team scope, others’ claims, and Trap School. Kitten, adult, and total columns help size the colony.",
      icon: Kanban,
      navHref: "/trap-queue",
      flowNote: "Unclaimed ↔ My claims · Filters for scope · Hotspots for geography.",
    }),
    step({
      id: "adv-admin-hotspots",
      title: "Map the same cases",
      description:
        "Hotspots shows colony locations from help requests. Volunteer pins only appear when someone opted in under My Profile → Directory & map visibility.",
      icon: Map,
      navHref: "/hotspots",
      flowNote: "Map pins ↔ Trap Queue records · volunteer pins are opt-in.",
    }),
    step({
      id: "adv-admin-appointments",
      title: "Clinic appointments connect cases to clinics",
      description:
        "When cats need surgery, reserve appointment slots and link them to cases. Clinics define capacity; appointments consume it.",
      icon: Calendar,
      navHref: "/appointments",
      visible: () => APPOINTMENTS_UI_ENABLED,
      flowNote: "Clinic settings → available slots → case appointments → transport/recovery follow-up.",
    }),
    step({
      id: "adv-admin-clinics",
      title: "Configure partner clinics",
      description:
        "Clinic records hold hours, services, and booking settings that power public clinic events.",
      icon: Building2,
      navHref: "/clinics",
      flowNote: "Clinic config → Clinic Events public booking.",
    }),
    step({
      id: "adv-admin-events",
      title: "Event staffing is separate from case work",
      description: SHIFT_SIGNUPS_UI_ENABLED
        ? "Clinic Events and Events handle outreach days and volunteer positions. Someone can help at an event without working trap cases — and vice versa."
        : "Events shows the shared calendar for outreach days. Case work stays in Trap Queue — someone can help at an event without working trap cases.",
      icon: CalendarDays,
      navHref: "/shift-board",
      flowNote: SHIFT_SIGNUPS_UI_ENABLED
        ? "Shifts claimed here show on each volunteer’s Dashboard and My Impact."
        : "Calendar view · case work stays in Trap Queue.",
    }),
    step({
      id: "adv-admin-feed",
      title: "Coordinate in Team Feed",
      description:
        "Announcements and discussion sit alongside formal queues. Use Feed for broadcast updates; keep case-specific decisions on the case itself.",
      icon: MessageSquare,
      navHref: "/team-feed",
      flowNote: "Feed ≠ case history — important case notes belong on the help request.",
    }),
    step({
      id: "adv-admin-reports",
      title: "Measure outcomes in Reports",
      description:
        "Reports roll up case, clinic, and volunteer activity. If numbers look wrong, check upstream data in Trap Queue, Clinic Events, and volunteer records first.",
      icon: BarChart3,
      navHref: "/reports",
      flowNote: "Reports read operational data — they don’t create it.",
    }),
    step({
      id: "adv-admin-settings",
      title: "Platform settings",
      description:
        "Admin covers users, trap teams, role descriptions, branding, imports, and Inquiry form custom fields (About us intro + after-submit paths matched to How you can help and total cats).",
      icon: Settings,
      navHref: "/admin",
      flowNote: "Teams + roles → sidebar · Inquiry form custom fields → public /request.",
    }),
  ],
};

const TRAP_LEAD_TRACK: AdvancedTutorialTrack = {
  id: "trap_team_lead",
  title: "Trap team lead workflow",
  summary: "How field cases connect to equipment, clinic events, and teammates.",
  roleLabel: "TNVR Team",
  steps: [
    step({
      id: "adv-trap-welcome",
      title: "Your role leading field work",
      description:
        "You coordinate trapping through recovery. New requests auto-assign to your team by ZIP; small colonies are tagged Trap School. This walkthrough ties Trap Queue to equipment and teammates.",
      icon: Sparkles,
    }),
    step({
      id: "adv-trap-queue",
      title: "Run the day from Trap Queue",
      description:
        "Use Unclaimed for open work (oldest first) and My claims for cases you own. The page opens on My claims when you have active claims. Update status as cats move through trap, transport, recovery, and return.",
      icon: Kanban,
      navHref: "/trap-queue",
      flowNote: "Unclaimed ↔ My claims · Filters for team / Trap School · kitten·adult·total columns.",
    }),
    step({
      id: "adv-trap-claim",
      title: "Claim before you edit",
      description:
        "Claim from Unclaimed so nobody else works the case at the same time. If details are missing, check case history rather than starting a duplicate request.",
      icon: Kanban,
      navHref: "/trap-queue",
      flowNote: "Public form auto-assigns · Trap Queue owns field work.",
    }),
    step({
      id: "adv-trap-map",
      title: "Plan with Hotspots",
      description:
        "Use the map to cluster nearby colonies and plan efficient trap nights. Colony pins match your queue cards; teammate pins only appear if they opted in on their profile.",
      icon: Map,
      navHref: "/hotspots",
      flowNote: "Map for planning · Queue for ownership and status.",
    }),
    step({
      id: "adv-trap-equipment",
      title: "Track gear in Equipment",
      description:
        "Log trap loans and returns so the team knows what’s in the field. Equipment checkout is independent of case status but should match real-world loans.",
      icon: Package,
      navHref: "/equipment",
      flowNote: "Case progress ≠ automatic equipment return — check both out.",
    }),
    step({
      id: "adv-trap-appointments",
      title: "Book clinic time from Appointments",
      description:
        "Reserve slots for cats that need surgery, then coordinate transport. Appointment records link clinic capacity to your case cats.",
      icon: Calendar,
      navHref: "/appointments",
      visible: () => APPOINTMENTS_UI_ENABLED,
      flowNote: "Trap success → appointment hold → transport → recovery → return.",
    }),
    step({
      id: "adv-trap-shifts",
      title: "Staff events on Events",
      description:
        "Community or clinic event days use Events. Claiming a shift doesn’t move a trap case — it’s separate volunteer staffing.",
      icon: CalendarDays,
      navHref: "/shift-board",
      visible: () => SHIFT_SIGNUPS_UI_ENABLED,
      flowNote: "Case work and event shifts are parallel tracks.",
    }),
    step({
      id: "adv-trap-directory",
      title: "Find teammates",
      description:
        "Team Directory shows contact details only when teammates chose to share them under Directory & map visibility. Use it for transporters, recovery homes, and handoffs.",
      icon: Users,
      navHref: "/team-directory",
      visible: (p) => p.canViewVolunteerDirectory,
      flowNote: "Directory for people · Queue for case state · sharing is opt-in.",
    }),
    step({
      id: "adv-trap-impact",
      title: "Your work shows in My Impact",
      description:
        "Cases you touch roll into personal impact stats — useful for recognizing team effort over time.",
      icon: Heart,
      navHref: "/my-impact",
    }),
  ],
};

const CLINIC_TRACK: AdvancedTutorialTrack = {
  id: "clinic_coordination",
  title: "Clinic coordination workflow",
  summary: "How clinic setup, appointments, and public events fit together.",
  roleLabel: "Clinic Coordination",
  steps: [
    step({
      id: "adv-clinic-welcome",
      title: "Your clinic coordination role",
      description:
        "You keep clinic capacity accurate and events bookable. This walkthrough shows the path from clinic setup → appointments → public events → volunteer staffing.",
      icon: Sparkles,
    }),
    step({
      id: "adv-clinic-clinics",
      title: "Maintain clinic records",
      description:
        "Update partner clinic details, services, and booking settings used by public clinic events.",
      icon: Building2,
      navHref: "/clinics",
      flowNote: "Clinic config feeds Clinic Events booking.",
    }),
    step({
      id: "adv-clinic-appointments",
      title: "Manage the appointments calendar",
      description:
        "As an admin, create clinic slots on the calendar and help teams reserve them for case cats. TNVR users can reserve existing slots but cannot add new ones.",
      icon: Calendar,
      navHref: "/appointments",
      visible: () => APPOINTMENTS_UI_ENABLED,
      flowNote: "Clinics → admin creates slots → teams reserve → case transport plans.",
    }),
    step({
      id: "adv-clinic-events",
      title: "Run public clinic events",
      description:
        "Clinic Events power public signup days. Capacity and services should stay consistent with the clinic record people expect.",
      icon: Stethoscope,
      navHref: "/clinic-events",
      flowNote: "Public clinic booking for community sign-ups.",
    }),
    step({
      id: "adv-clinic-shifts",
      title: "Staff the day on Events",
      description:
        "Create event positions and shifts so volunteers can claim roles (registration, parking, etc.). Event staffing complements clinic capacity.",
      icon: CalendarDays,
      navHref: "/shift-board",
      visible: () => SHIFT_SIGNUPS_UI_ENABLED,
      flowNote: "Clinic Events = cat capacity · Events shifts = volunteer positions.",
    }),
    step({
      id: "adv-clinic-trap",
      title: "Stay aware of field demand",
      description:
        "Trap Queue volume (Unclaimed and claimed cases) drives clinic-day demand. Watch the queue so clinic days aren’t over- or under-booked.",
      icon: Kanban,
      navHref: "/trap-queue",
      flowNote: "Field success creates clinic demand.",
    }),
    step({
      id: "adv-clinic-resources",
      title: "Share SOPs in Resources",
      description:
        "Clinic-day checklists and partner SOPs belong in Resources so volunteers can reopen them without hunting chat history.",
      icon: BookOpen,
      navHref: "/resources",
    }),
  ],
};

const CASE_VOLUNTEER_TRACK: AdvancedTutorialTrack = {
  id: "case_volunteer",
  title: "Field volunteer workflow",
  summary: "How intake, trap work, and gear fit together when you help on cases.",
  roleLabel: "Field Volunteer",
  steps: [
    step({
      id: "adv-case-welcome",
      title: "Your role on cases",
      description:
        "You help move colonies through trapping and clinic care. This walkthrough shows which page owns each stage and how your updates help the next volunteer.",
      icon: Sparkles,
    }),
    step({
      id: "adv-case-dashboard",
      title: "Start from your dashboard",
      description:
        "Dashboard highlights active work relevant to you. Use it as a launchpad, then go to Trap Queue for details.",
      icon: Compass,
      navHref: "/",
      flowNote: "Dashboard summarizes · Queues hold the live case actions.",
    }),
    step({
      id: "adv-case-trap",
      title: "Execute in Trap Queue",
      description:
        "Switch Unclaimed vs My claims. Claim from Unclaimed (oldest first), then update status as you trap, transport, or recover cats. Open Filters for team scope or Trap School.",
      icon: Kanban,
      navHref: "/trap-queue",
      visible: (p) => p.canViewTrapQueue,
      flowNote: "ZIP assign · Trap School tag ≤5 · Claim before editing.",
    }),
    step({
      id: "adv-case-equipment",
      title: "Check gear in and out",
      description:
        "Use Equipment whenever traps leave with you or return. That record prevents lost gear and double-booking traps.",
      icon: Package,
      navHref: "/equipment",
      visible: (p) => p.routes.includes("/equipment"),
      flowNote: "Finishing a case doesn’t auto-return equipment — log both.",
    }),
    step({
      id: "adv-case-appointments",
      title: "Appointments for clinic days",
      description:
        "When cats need surgery, appointments reserve clinic capacity. Coordinate with your lead before holding slots you can’t fill.",
      icon: Calendar,
      navHref: "/appointments",
      visible: (p) => APPOINTMENTS_UI_ENABLED && p.canManageAppointments,
      flowNote: "Trap → appointment → transport → recovery → return.",
    }),
    step({
      id: "adv-case-shifts",
      title: "Event shifts are optional extras",
      description:
        "Events is for event positions (registration, outreach days). Claiming a shift doesn’t assign you a trap case.",
      icon: CalendarDays,
      navHref: "/shift-board",
      visible: (p) => SHIFT_SIGNUPS_UI_ENABLED && p.canClaimShifts,
      flowNote: "Two volunteer paths: case queues and event shifts.",
    }),
    step({
      id: "adv-case-feed",
      title: "Follow Team Feed",
      description:
        "Watch for schedule changes and shout-outs. Case-specific instructions still live on the case card.",
      icon: MessageSquare,
      navHref: "/team-feed",
    }),
    step({
      id: "adv-case-impact",
      title: "See your contribution",
      description:
        "My Impact reflects cases you’ve taken part in — a personal record of your help over time.",
      icon: Heart,
      navHref: "/my-impact",
    }),
  ],
};

const EVENT_VOLUNTEER_TRACK: AdvancedTutorialTrack = {
  id: "event_volunteer",
  title: "Event & community volunteer workflow",
  summary: "How shifts, team updates, resources, and your profile work together.",
  roleLabel: "Event Volunteer",
  steps: [
    step({
      id: "adv-event-welcome",
      title: "Your volunteer path",
      description:
        "You’re here mainly for events, crafting, outreach, or content — not necessarily trap cases. This walkthrough shows how to find work and stay connected.",
      icon: Sparkles,
    }),
    step({
      id: "adv-event-shifts",
      title: SHIFT_SIGNUPS_UI_ENABLED ? "Claim work on Events" : "Check upcoming Events",
      description: SHIFT_SIGNUPS_UI_ENABLED
        ? "Open events list positions (for example Registration Desk) with dated shifts. Sign up for a slot you can keep — your claim reserves capacity for that position."
        : "Open Events to see the shared calendar of outreach days and volunteer gatherings.",
      icon: CalendarDays,
      navHref: "/shift-board",
      flowNote: SHIFT_SIGNUPS_UI_ENABLED
        ? "Action: open event → choose position → Sign Up on a dated shift."
        : "Calendar view for team events.",
    }),
    step({
      id: "adv-event-dashboard",
      title: "Confirm on your dashboard",
      description:
        "Upcoming claimed shifts appear on the Dashboard with countdown timing. That’s your personal schedule view after signing up.",
      icon: ClipboardCheck,
      navHref: "/",
      visible: () => SHIFT_SIGNUPS_UI_ENABLED,
      flowNote: "Events creates the claim · Dashboard reminds you.",
    }),
    step({
      id: "adv-event-feed",
      title: "Watch Team Feed for changes",
      description:
        "Leads post event updates, weather calls, and thank-yous here. Check Feed the day before a shift.",
      icon: MessageSquare,
      navHref: "/team-feed",
      flowNote: "Feed announcements can change shift plans — verify before you go.",
    }),
    step({
      id: "adv-event-directory",
      title: "Find other volunteers",
      description:
        "Team Directory shows phone, email, or address only when teammates chose to share them. Use it for handoffs or supply drops when those details are visible.",
      icon: Users,
      navHref: "/team-directory",
      visible: (p) => p.canViewVolunteerDirectory,
      flowNote: "Contact sharing is opt-in on each person’s profile.",
    }),
    step({
      id: "adv-event-resources",
      title: "Read Resources before you start",
      description:
        "SOPs, craft guidelines, and event checklists live in Resources. Reopen this walkthrough from there anytime.",
      icon: BookOpen,
      navHref: "/resources",
    }),
    step({
      id: "adv-event-profile",
      title: "Keep interests and contact info updated",
      description:
        "My Profile holds volunteer interests, certificates, and Directory & map visibility. Sharing starts off — turn on only what you want teammates to see. Interests help staffing; they don’t change which pages you can open.",
      icon: UserRound,
      navHref: "/profile",
      flowNote: "Interests → staffing fit; platform role → page access; visibility → opt-in sharing.",
    }),
    step({
      id: "adv-event-impact",
      title: "Track your impact",
      description:
        "After you help, My Impact reflects shifts and contributions over time.",
      icon: Heart,
      navHref: "/my-impact",
    }),
  ],
};

const GENERAL_TRACK: AdvancedTutorialTrack = {
  id: "general",
  title: "Getting oriented",
  summary: "A deeper look at how the pages you can access fit together.",
  roleLabel: "Volunteer",
  steps: [
    step({
      id: "adv-general-welcome",
      title: "How the portal fits together",
      description:
        "This advanced walkthrough explains the relationship between your dashboard, team updates, resources, and profile — tailored to what you can access.",
      icon: Sparkles,
    }),
    step({
      id: "adv-general-dashboard",
      title: "Dashboard is your launchpad",
      description:
        "Start here for quick links and anything assigned to you. Deeper work happens on the specialized pages in the sidebar.",
      icon: Compass,
      navHref: "/",
    }),
    step({
      id: "adv-general-feed",
      title: "Team Feed keeps you in the loop",
      description:
        "Announcements and conversation live here. It’s the shared bulletin board for your team.",
      icon: MessageSquare,
      navHref: "/team-feed",
    }),
    step({
      id: "adv-general-shifts",
      title: SHIFT_SIGNUPS_UI_ENABLED ? "Events for timed volunteer slots" : "Events calendar",
      description: SHIFT_SIGNUPS_UI_ENABLED
        ? "If you have shift access, claim event positions here. Claims appear back on your dashboard."
        : "Open Events to browse the shared team calendar.",
      icon: CalendarDays,
      navHref: "/shift-board",
      visible: (p) => p.canClaimShifts,
      flowNote: SHIFT_SIGNUPS_UI_ENABLED
        ? "Events ↔ Dashboard upcoming shifts."
        : "Events shows the shared calendar.",
    }),
    step({
      id: "adv-general-resources",
      title: "Resources for reference",
      description:
        "Handbooks and SOPs stay in Resources. Prefer documents here over screenshots in chat.",
      icon: BookOpen,
      navHref: "/resources",
    }),
    step({
      id: "adv-general-profile",
      title: "Keep profile details current",
      description:
        "Complete contact details, interests, and certificates on My Profile. Directory & map visibility defaults to hidden until you choose to share. Page access still comes from your platform role.",
      icon: UserRound,
      navHref: "/profile",
      flowNote: "Profile completeness → better staffing matches · sharing is opt-in.",
    }),
    step({
      id: "adv-general-impact",
      title: "My Impact over time",
      description:
        "As you help, contributions accumulate on My Impact.",
      icon: Heart,
      navHref: "/my-impact",
    }),
  ],
};

function filterTrackSteps(
  track: AdvancedTutorialTrack,
  permissions: ProfilePermissions
): AdvancedTutorialTrack {
  return {
    ...track,
    steps: track.steps.filter((entry) => !entry.visible || entry.visible(permissions)),
  };
}

/**
 * Pick the advanced workflow track that best matches platform role.
 * Volunteer interests do not change the track — all volunteers share one path.
 */
export function advancedTrackForProfile(profile: Profile | null): AdvancedTutorialTrack | null {
  const permissions = getProfilePermissions(profile);
  if (!profile?.role || !permissions) return null;

  const role: UserRole = profile.role;
  let track: AdvancedTutorialTrack;

  if (role === "admin") {
    track = ADMIN_TRACK;
  } else if (role === "trap_team_lead") {
    track = TRAP_LEAD_TRACK;
  } else {
    // All volunteers (and any residual clinic interests) use the event/community track.
    track = EVENT_VOLUNTEER_TRACK;
  }

  return filterTrackSteps(track, permissions);
}

export function tutorialStepsForMode(
  mode: TutorialMode,
  profile: Profile | null,
  quickSteps: PlatformTutorialStep[]
): { steps: PlatformTutorialStep[]; track: AdvancedTutorialTrack | null } {
  if (mode === "advanced") {
    const track = advancedTrackForProfile(profile);
    return { steps: track?.steps ?? quickSteps, track };
  }
  return { steps: quickSteps, track: null };
}
