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
} from "lucide-react";
import type { ProfilePermissions } from "@/lib/permissions";

export interface PlatformTutorialStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  visible?: (permissions: ProfilePermissions) => boolean;
}

export const PLATFORM_TUTORIAL_STEPS: PlatformTutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to TNVR Rescue",
    description:
      "This walkthrough highlights the main areas of the volunteer portal. You can reopen it anytime from Resources.",
    icon: Sparkles,
  },
  {
    id: "dashboard",
    title: "Your dashboard",
    description:
      "The dashboard is your home base — upcoming shifts, cases you are working, team updates, and quick links tailored to your role.",
    icon: LayoutDashboard,
  },
  {
    id: "navigation",
    title: "Sidebar navigation",
    description:
      "Use the menu on the left to move around the platform. You only see pages that match your platform role and volunteer interests.",
    icon: Navigation,
  },
  {
    id: "inquiry-queue",
    title: "Inquiry queue",
    description:
      "New help requests land here. Intake volunteers review details, contact colony caretakers, and claim cases to work them through the pipeline.",
    icon: Inbox,
    visible: (p) => p.canViewIntakeQueue,
  },
  {
    id: "trap-queue",
    title: "Trap queue",
    description:
      "Cases ready for field work appear on the trap board. Trap teams coordinate trapping, transport, and recovery from here.",
    icon: Kanban,
    visible: (p) => p.canViewTrapQueue,
  },
  {
    id: "appointments",
    title: "Appointments",
    description:
      "Schedule and manage clinic appointments linked to active cases — holds, confirmations, and payment status.",
    icon: Calendar,
    visible: (p) => p.canManageAppointments,
  },
  {
    id: "equipment",
    title: "Equipment",
    description:
      "Log trap loans and returns, scan QR labels, and track who has field gear checked out.",
    icon: Package,
    visible: (p) => p.routes.includes("/equipment"),
  },
  {
    id: "shift-board",
    title: "Shift board",
    description:
      "Browse open volunteer shifts for events and clinics. Claim a slot when you are available — your upcoming shifts also show on the dashboard.",
    icon: CalendarDays,
    visible: (p) => p.canClaimShifts,
  },
  {
    id: "team-feed",
    title: "Team feed",
    description:
      "Announcements, celebrations, and team conversation. Check here for org-wide updates and birthday shout-outs.",
    icon: MessageSquare,
  },
  {
    id: "my-impact",
    title: "My impact",
    description:
      "See your contribution over time — cats helped, cases touched, and other stats that reflect your volunteer work.",
    icon: Heart,
  },
  {
    id: "resources",
    title: "Resources",
    description:
      "Handbooks, SOPs, onboarding documents, and this platform walkthrough live under Resources whenever you need a refresher.",
    icon: BookOpen,
  },
  {
    id: "profile",
    title: "My profile",
    description:
      "Keep contact info current, review your volunteer roles, and upload your TNVR certificate when you are ready for field team assignment.",
    icon: UserRound,
  },
];

export function tutorialStepsForPermissions(
  permissions: ProfilePermissions | null
): PlatformTutorialStep[] {
  if (!permissions) return PLATFORM_TUTORIAL_STEPS.filter((step) => !step.visible);

  return PLATFORM_TUTORIAL_STEPS.filter((step) => !step.visible || step.visible(permissions));
}
