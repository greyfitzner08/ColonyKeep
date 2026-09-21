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
        "You see every module. This advanced walkthrough follows the operational path: people → cases → clinics → volunteer events → reporting.",
      icon: Sparkles,
    }),
    step({
      id: "adv-admin-people",
      title: "Start with people",
      description:
        "Approve volunteer applications and assign platform roles in Volunteers. Platform role controls which queues and pages someone can open — fixing access problems usually starts here.",
      icon: Users,
      navHref: "/volunteers",
      flowNote: "Platform role unlocks Trap Queue, Clinics, etc. Interests are for staffing only.",
    }),
    step({
      id: "adv-admin-intake",
      title: "Cases land in the Trap Queue",
      description:
        "New colony requests auto-assign to a trap team by ZIP, or to Trap School when 5 or fewer cats/kittens are reported. Staff claim them from the Trap Queue and work field logistics.",
      icon: Kanban,
      navHref: "/trap-queue",
      flowNote: "Public form → auto team assignment → Trap Queue.",
    }),
    step({
      id: "adv-admin-trap",
      title: "Field work lives in the Trap Queue",
      description:
        "Once a case is ready for trapping, transport, or recovery, teams work it from the Trap Queue. Status changes and notes here are what other volunteers rely on.",
      icon: Kanban,
      navHref: "/trap-queue",
      flowNote: "Hotspots Map uses the same cases for geographic planning.",
    }),
    step({
      id: "adv-admin-hotspots",
      title: "Map the same cases",
      description:
        "Hotspots shows colony locations from help requests. Use it with the queues — not instead of them — when planning routes or spotting nearby colonies.",
      icon: Map,
      navHref: "/hotspots",
      flowNote: "Map pins ↔ Trap Queue records for the same cases.",
    }),
    step({
      id: "adv-admin-appointments",
      title: "Clinic appointments connect cases to clinics",
      description:
        "When cats need surgery, reserve appointment slots and link them to cases. Clinics define capacity; appointments consume it.",
      icon: Calendar,
      navHref: "/appointments",
      flowNote: "Clinic settings → available slots → case appointments → transport/recovery follow-up.",
    }),
    step({
      id: "adv-admin-clinics",
      title: "Configure partner clinics",
      description:
        "Clinic records hold hours, services, and slot rules that power the appointments calendar and public clinic events.",
      icon: Building2,
      navHref: "/clinics",
      flowNote: "Change a clinic here and appointment booking reflects it.",
    }),
    step({
      id: "adv-admin-events",
      title: "Event staffing is separate from case work",
      description:
        "Clinic Events and the Shift Board handle outreach days and volunteer positions. Someone can help at an event without working trap cases — and vice versa.",
      icon: CalendarDays,
      navHref: "/shift-board",
      flowNote: "Shifts claimed here show on each volunteer’s Dashboard and My Impact.",
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
        "Reports roll up case, clinic, and volunteer activity. If numbers look wrong, check upstream data in queues, appointments, and volunteer records first.",
      icon: BarChart3,
      navHref: "/reports",
      flowNote: "Reports read operational data — they don’t create it.",
    }),
    step({
      id: "adv-admin-settings",
      title: "Platform settings",
      description:
        "Admin settings cover users, trap teams, role descriptions, and imports. Use this when someone can’t see a page they should — often a role or team assignment issue.",
      icon: Settings,
      navHref: "/admin",
      flowNote: "Teams + roles → what appears in each person’s sidebar.",
    }),
  ],
};

const TRAP_LEAD_TRACK: AdvancedTutorialTrack = {
  id: "trap_team_lead",
  title: "Trap team lead workflow",
  summary: "How field cases connect to equipment, appointments, clinics, and volunteer shifts.",
  roleLabel: "TNVR Team",
  steps: [
    step({
      id: "adv-trap-welcome",
      title: "Your role leading field work",
      description:
        "You coordinate trapping through recovery. New requests auto-assign to your team (or Trap School for small colonies). This walkthrough ties the Trap Queue to equipment and appointments.",
      icon: Sparkles,
    }),
    step({
      id: "adv-trap-queue",
      title: "Run the day from Trap Queue",
      description:
        "Active field cases live here. Update status as cats are trapped, transported, recovered, and returned so clinic folks stay in sync.",
      icon: Kanban,
      navHref: "/trap-queue",
      flowNote: "Action: open case → update status / cats → leave notes for the next person.",
    }),
    step({
      id: "adv-trap-claim",
      title: "Claim before you edit",
      description:
        "Claim an unassigned case so nobody else works it at the same time. If details are missing, check case history or mark Needs more info rather than starting a duplicate request.",
      icon: Kanban,
      navHref: "/trap-queue",
      flowNote: "Public form auto-assigns · Trap Queue owns field work.",
    }),
    step({
      id: "adv-trap-map",
      title: "Plan with Hotspots",
      description:
        "Use the map to cluster nearby colonies and plan efficient trap nights. Pins are the same cases as your queue cards.",
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
      flowNote: "Trap success → appointment hold → transport → recovery → return.",
    }),
    step({
      id: "adv-trap-shifts",
      title: "Staff events on Shift Board",
      description:
        "Community or clinic event days use the Shift Board. Claiming a shift doesn’t move a trap case — it’s separate volunteer staffing.",
      icon: CalendarDays,
      navHref: "/shift-board",
      flowNote: "Case work and event shifts are parallel tracks.",
    }),
    step({
      id: "adv-trap-directory",
      title: "Find teammates",
      description:
        "Team Directory helps you reach transporters, recovery homes, and other volunteers when a case needs a handoff.",
      icon: Users,
      navHref: "/team-directory",
      visible: (p) => p.canViewVolunteerDirectory,
      flowNote: "Directory for people · Queue for case state.",
    }),
    step({
      id: "adv-trap-impact",
      title: "Your work shows in My Impact",
      description:
        "Cases you touch and shifts you claim roll into personal impact stats — useful for recognizing team effort over time.",
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
        "Update partner clinic details, services, and slot rules. Appointment availability depends on what’s configured here.",
      icon: Building2,
      navHref: "/clinics",
      flowNote: "Clinic config is the source of booking capacity.",
    }),
    step({
      id: "adv-clinic-appointments",
      title: "Manage the appointments calendar",
      description:
        "As an admin, create clinic slots on the calendar and help teams reserve them for case cats. TNVR users can reserve existing slots but cannot add new ones.",
      icon: Calendar,
      navHref: "/appointments",
      flowNote: "Clinics → admin creates slots → teams reserve → case transport plans.",
    }),
    step({
      id: "adv-clinic-events",
      title: "Run public clinic events",
      description:
        "Clinic Events power public signup days. Capacity and services should stay consistent with the clinic record people expect.",
      icon: Stethoscope,
      navHref: "/clinic-events",
      flowNote: "Public event booking is separate from internal case appointments.",
    }),
    step({
      id: "adv-clinic-shifts",
      title: "Staff the day on Shift Board",
      description:
        "Create event positions and shifts so volunteers can claim roles (registration, parking, etc.). Event staffing complements clinic capacity — it doesn’t replace appointment slots.",
      icon: CalendarDays,
      navHref: "/shift-board",
      flowNote: "Appointments = cat capacity · Shifts = volunteer positions.",
    }),
    step({
      id: "adv-clinic-trap",
      title: "Stay aware of field demand",
      description:
        "Trap Queue and case volume drive when appointment slots get used. Watch demand so clinic days aren’t over- or under-booked.",
      icon: Kanban,
      navHref: "/trap-queue",
      flowNote: "Field success creates appointment demand.",
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
  summary: "How intake, trap work, appointments, and gear fit together when you help on cases.",
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
        "Dashboard highlights upcoming shifts and active work relevant to you. Use it as a launchpad, then go to the queue for details.",
      icon: Compass,
      navHref: "/",
      flowNote: "Dashboard summarizes · Queues hold the live case actions.",
    }),
    step({
      id: "adv-case-trap",
      title: "Execute in Trap Queue",
      description:
        "New requests land here automatically. Claim a case, then update it as you trap, transport, or recover cats. Status is how leads know what’s left to do.",
      icon: Kanban,
      navHref: "/trap-queue",
      visible: (p) => p.canViewTrapQueue,
      flowNote: "Auto-assigned by ZIP or Trap School · Claim before editing.",
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
      visible: (p) => p.canManageAppointments,
      flowNote: "Trap → appointment → transport → recovery → return.",
    }),
    step({
      id: "adv-case-shifts",
      title: "Event shifts are optional extras",
      description:
        "Shift Board is for event positions (registration, outreach days). Claiming a shift doesn’t assign you a trap case.",
      icon: CalendarDays,
      navHref: "/shift-board",
      visible: (p) => p.canClaimShifts,
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
        "My Impact reflects cases and shifts you’ve taken part in — a personal record of your help over time.",
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
      title: "Claim work on Shift Board",
      description:
        "Open events list positions (for example Registration Desk) with dated shifts. Sign up for a slot you can keep — your claim reserves capacity for that position.",
      icon: CalendarDays,
      navHref: "/shift-board",
      flowNote: "Action: open event → choose position → Sign Up on a dated shift.",
    }),
    step({
      id: "adv-event-dashboard",
      title: "Confirm on your dashboard",
      description:
        "Upcoming claimed shifts appear on the Dashboard with countdown timing. That’s your personal schedule view after signing up.",
      icon: ClipboardCheck,
      navHref: "/",
      flowNote: "Shift Board creates the claim · Dashboard reminds you.",
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
        "Team Directory helps you coordinate with people working the same event when you need a handoff or supply drop.",
      icon: Users,
      navHref: "/team-directory",
      visible: (p) => p.canViewVolunteerDirectory,
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
        "My Profile holds your volunteer interests and certificate uploads. Interests help admins match you to the right shifts — they don’t change which pages you can open.",
      icon: UserRound,
      navHref: "/profile",
      flowNote: "Interests → staffing fit; platform role → page access.",
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
      title: "Shift Board for timed volunteer slots",
      description:
        "If you have shift access, claim event positions here. Claims appear back on your dashboard.",
      icon: CalendarDays,
      navHref: "/shift-board",
      visible: (p) => p.canClaimShifts,
      flowNote: "Shift Board ↔ Dashboard upcoming shifts.",
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
        "Complete contact details, interests, and certificates on My Profile so organizers can match you to shifts. Page access still comes from your platform role.",
      icon: UserRound,
      navHref: "/profile",
      flowNote: "Profile completeness → better staffing matches.",
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
