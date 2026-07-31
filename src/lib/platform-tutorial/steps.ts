import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Inbox,
  Kanban,
  Calendar,
  CalendarDays,
  MessageSquare,
  Heart,
  BookOpen,
  UserRound,
  Package,
  Navigation,
  Sparkles,
  Map,
  Building2,
  Stethoscope,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";
import type { ProfilePermissions } from "@/lib/permissions";

export interface PlatformTutorialStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Sidebar route to highlight and optionally open during this step. */
  navHref?: string;
  /** Highlight the whole sidebar nav (no route navigation). */
  highlightSidebar?: boolean;
  /** Navigate to navHref when the step is shown. Defaults to true when navHref is set. */
  navigateOnStep?: boolean;
  /** Short callout explaining how this step connects to other parts of the system. */
  flowNote?: string;
  visible?: (permissions: ProfilePermissions) => boolean;
}

export function welcomeDescription(permissions: ProfilePermissions): string {
  return `You're signed in as ${permissions.label}. This walkthrough covers only the pages in your sidebar — reopen it anytime from Resources.`;
}

export const PLATFORM_TUTORIAL_STEPS: PlatformTutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to TNVR Rescue",
    description: "",
    icon: Sparkles,
  },
  {
    id: "dashboard",
    title: "Your dashboard",
    description:
      "Your home base for upcoming shifts, active cases, team updates, and quick links picked for your role.",
    icon: LayoutDashboard,
    navHref: "/",
  },
  {
    id: "navigation",
    title: "Sidebar navigation",
    description:
      "The menu on the left is your map of the platform. Each step in this tour highlights the matching item.",
    icon: Navigation,
    highlightSidebar: true,
    navigateOnStep: false,
  },
  {
    id: "inquiry-queue",
    title: "Inquiry queue",
    description:
      "New help requests land here. Claim a case before reviewing details, confirm information is complete, then route it to a trap team — inquiry reviews cases and does not close them.",
    icon: Inbox,
    navHref: "/intake",
    visible: (p) => p.canViewIntakeQueue,
  },
  {
    id: "trap-queue",
    title: "Trap queue",
    description:
      "Cases ready for field work appear here. Trap teams coordinate trapping, transport, and recovery.",
    icon: Kanban,
    navHref: "/trap-queue",
    visible: (p) => p.canViewTrapQueue,
  },
  {
    id: "hotspots",
    title: "Hotspots map",
    description:
      "See colony locations across the region on a map — useful for planning routes and spotting nearby activity.",
    icon: Map,
    navHref: "/hotspots",
    visible: (p) => p.routes.includes("/hotspots"),
  },
  {
    id: "appointments",
    title: "Appointments",
    description:
      "Schedule and manage clinic appointments linked to active cases — holds, confirmations, and payment status.",
    icon: Calendar,
    navHref: "/appointments",
    visible: (p) => p.canManageAppointments,
  },
  {
    id: "clinics",
    title: "Clinics",
    description: "Manage partner clinic details, hours, and booking settings used for TNVR appointments.",
    icon: Building2,
    navHref: "/clinics",
    visible: (p) => p.canManageClinics,
  },
  {
    id: "clinic-events",
    title: "Clinic events",
    description: "Create and manage spay/neuter clinic events, capacity, and volunteer scheduling.",
    icon: Stethoscope,
    navHref: "/clinic-events",
    visible: (p) => p.canManageClinicEvents,
  },
  {
    id: "equipment",
    title: "Equipment",
    description:
      "Log trap loans and returns, scan QR labels, and track who has field gear checked out.",
    icon: Package,
    navHref: "/equipment",
    visible: (p) => p.routes.includes("/equipment"),
  },
  {
    id: "volunteers",
    title: "Volunteers",
    description: "Review applications, approve roles, and manage volunteer onboarding.",
    icon: Users,
    navHref: "/volunteers",
    visible: (p) => p.canManageVolunteers,
  },
  {
    id: "shift-board",
    title: "Shift board",
    description:
      "Browse open volunteer shifts. Claim a slot when you're available — upcoming shifts also show on the dashboard.",
    icon: CalendarDays,
    navHref: "/shift-board",
    visible: (p) => p.canClaimShifts,
  },
  {
    id: "team-feed",
    title: "Team feed",
    description:
      "Announcements, celebrations, and team conversation — including birthday shout-outs.",
    icon: MessageSquare,
    navHref: "/team-feed",
  },
  {
    id: "my-impact",
    title: "My impact",
    description: "Track your contribution over time — cats helped, cases touched, and volunteer stats.",
    icon: Heart,
    navHref: "/my-impact",
  },
  {
    id: "resources",
    title: "Resources",
    description:
      "Handbooks, SOPs, onboarding documents, and this walkthrough whenever you need a refresher.",
    icon: BookOpen,
    navHref: "/resources",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Run operational reports on cases, teams, clinics, and volunteer activity.",
    icon: BarChart3,
    navHref: "/reports",
    visible: (p) => p.canViewReports,
  },
  {
    id: "admin",
    title: "Admin settings",
    description: "Manage users, trap teams, role descriptions, and data imports.",
    icon: Settings,
    navHref: "/admin",
    visible: (p) => p.canManageAdmin,
  },
  {
    id: "profile",
    title: "My profile",
    description:
      "Keep contact info current, review volunteer roles, and upload your TNVR certificate when ready for field team assignment.",
    icon: UserRound,
    navHref: "/profile",
  },
];

export function tutorialStepsForPermissions(
  permissions: ProfilePermissions | null
): PlatformTutorialStep[] {
  if (!permissions) return PLATFORM_TUTORIAL_STEPS.filter((step) => !step.visible);

  return PLATFORM_TUTORIAL_STEPS.filter((step) => !step.visible || step.visible(permissions));
}

export function stepDescription(
  step: PlatformTutorialStep,
  permissions: ProfilePermissions | null
): string {
  if (step.id === "welcome" && permissions) {
    return welcomeDescription(permissions);
  }
  return step.description;
}
