"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Inbox,
  Kanban,
  Calendar,
  Building2,
  Map,
  Users,
  CalendarDays,
  MessageSquare,
  BarChart3,
  Settings,
  Heart,
  Stethoscope,
  Handshake,
  Menu,
  X,
  BookOpen,
  Package,
  UserRound,
  Contact,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProfilePermissions } from "@/lib/permissions";
import { useTutorialNavigation } from "@/components/platform-tutorial/tutorial-navigation-context";
import { Z_INDEX } from "@/lib/z-index";
import type { Profile, RoleDescription } from "@/lib/types";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/branding/brand-mark";
import { LogoutButton } from "@/components/layout/logout-button";
import { AdminRolePreviewControl } from "@/components/admin/admin-role-preview";
import { PlatformTutorialTrigger } from "@/components/platform-tutorial/platform-tutorial-trigger";
import { useTeamFeedNavIndicator } from "@/components/layout/use-team-feed-nav-indicator";
import type { TeamFeedActivity } from "@/lib/team-feed/activity";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/my-impact", label: "My Impact", icon: Heart },
    ],
  },
  {
    id: "cases",
    label: "Operations",
    items: [
      { href: "/intake", label: "Inquiry Queue", icon: Inbox },
      { href: "/trap-queue", label: "Trap Queue", icon: Kanban },
      { href: "/appointments", label: "Appointments", icon: Calendar },
      { href: "/hotspots", label: "Hotspots Map", icon: Map },
      { href: "/equipment", label: "Equipment", icon: Package },
    ],
  },
  {
    id: "clinics",
    label: "Clinics",
    items: [
      { href: "/clinics", label: "Clinics", icon: Building2 },
      { href: "/clinic-events", label: "Clinic Events", icon: Stethoscope },
    ],
  },
  {
    id: "team",
    label: "Team",
    items: [
      { href: "/team-feed", label: "Team Feed", icon: MessageSquare },
      { href: "/team-directory", label: "Team Directory", icon: Contact },
      { href: "/shift-board", label: "Shift Board", icon: CalendarDays },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    items: [
      { href: "/resources", label: "Resources", icon: BookOpen },
      { href: "/profile", label: "My Profile", icon: UserRound },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      { href: "/community-partners", label: "Community Partners", icon: Handshake },
      { href: "/volunteers", label: "Volunteers", icon: Users },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin", label: "Admin", icon: Settings },
    ],
  },
];

function isRouteAllowed(href: string, allowedRoutes: string[]): boolean {
  return allowedRoutes.some(
    (route) => href === route || (route !== "/" && href.startsWith(route))
  );
}

function visibleNavGroups(allowedRoutes: string[]): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isRouteAllowed(item.href, allowedRoutes)),
  })).filter((group) => group.items.length > 0);
}

interface SidebarProps {
  profile: Profile | null;
  userName?: string | null;
  isAdmin?: boolean;
  previewKey?: string | null;
  roleDescriptions?: RoleDescription[];
  teamFeedActivity?: TeamFeedActivity | null;
}

export function Sidebar({
  profile,
  userName,
  isAdmin = false,
  previewKey = null,
  roleDescriptions = [],
  teamFeedActivity = null,
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { highlightedNav, tourActive } = useTutorialNavigation();
  const showTeamFeedIndicator = useTeamFeedNavIndicator(teamFeedActivity, profile?.id);

  const permissions = getProfilePermissions(profile);
  const allowedRoutes = permissions?.routes ?? [];
  const visibleGroups = visibleNavGroups(allowedRoutes);

  useEffect(() => {
    if (!tourActive || !highlightedNav || highlightedNav === "sidebar") return;
    const element = document.querySelector(`[data-tutorial-nav="${highlightedNav}"]`);
    element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedNav, tourActive]);

  const nav = (
    <nav className="flex h-full min-h-0 flex-col p-4">
      <div className="mb-6 flex shrink-0 items-center gap-2 px-2">
        <BrandMark
          surface="dark"
          nameClassName="text-sidebar-foreground"
          subtitle="Colony Management"
          subtitleClassName="text-sidebar-foreground/60"
        />
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto -mx-2 px-2",
          tourActive && highlightedNav === "sidebar" && "rounded-md ring-2 ring-primary ring-offset-2 ring-offset-sidebar"
        )}
      >
        <div className="flex flex-col gap-4">
          {visibleGroups.map((group) => (
            <div key={group.id} className="flex flex-col gap-1">
              <p className="px-3 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/45">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                const tourHighlight = tourActive && highlightedNav === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tutorial-nav={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      tourHighlight &&
                        "ring-2 ring-amber-400 ring-offset-2 ring-offset-sidebar shadow-md animate-pulse"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {item.href === "/team-feed" && showTeamFeedIndicator && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400/75"
                        aria-label="New team feed activity"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {userName && (
        <div className="mt-3 shrink-0 space-y-2 border-t border-sidebar-border pt-3">
          <div className="flex items-start justify-between gap-2 px-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-sidebar-foreground/60">Signed in as</p>
              <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
              {permissions && (
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {previewKey ? `${permissions.label} (preview)` : permissions.label}
                </p>
              )}
            </div>
            {isAdmin && (
              <AdminRolePreviewControl
                previewKey={previewKey}
              />
            )}
          </div>
          <PlatformTutorialTrigger
            profile={profile}
            userName={userName}
            variant="sidebar"
          />
          <LogoutButton />
        </div>
      )}
    </nav>
  );

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 flex h-14 items-center gap-3 border-b bg-background px-3 lg:hidden"
        style={{ zIndex: Z_INDEX.mobileMenuButton }}
      >
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 bg-background shadow-sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <BrandMark
          className="min-w-0"
          iconClassName="h-7 w-7"
          nameClassName="truncate text-sm"
        />
      </header>

      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border",
          tourActive && "shadow-lg"
        )}
        style={{ zIndex: tourActive ? Z_INDEX.tutorialSidebar : Z_INDEX.sidebar }}
      >
        {nav}
      </aside>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 lg:hidden"
            style={{ zIndex: Z_INDEX.mobileNavBackdrop }}
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside
            className="fixed bottom-0 left-0 top-14 flex w-64 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar shadow-xl lg:hidden"
            style={{ zIndex: Z_INDEX.mobileNavPanel }}
          >
            {nav}
          </aside>
        </>
      )}
    </>
  );
}
