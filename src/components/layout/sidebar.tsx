"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Kanban,
  Calendar,
  Building2,
  Map,
  MapPin,
  Users,
  CalendarDays,
  MessageSquare,
  BarChart3,
  Settings,
  Heart,
  Stethoscope,
  Handshake,
  ChevronDown,
  Menu,
  X,
  BookOpen,
  Package,
  UserRound,
  Contact,
  PawPrint,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProfilePermissions } from "@/lib/permissions";
import { useTutorialNavigation } from "@/components/platform-tutorial/tutorial-navigation-context";
import { Z_INDEX } from "@/lib/z-index";
import type { Profile, RoleDescription } from "@/lib/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/branding/brand-mark";
import { LogoutButton } from "@/components/layout/logout-button";
import { AdminRolePreviewControl } from "@/components/admin/admin-role-preview";
import { PlatformTutorialTrigger } from "@/components/platform-tutorial/platform-tutorial-trigger";
import { useAdoptionApplicationsNavIndicator } from "@/components/layout/use-adoption-applications-nav-indicator";
import { useTeamFeedNavIndicator } from "@/components/layout/use-team-feed-nav-indicator";
import type { AdoptionApplicationsActivity } from "@/lib/adoption/activity";
import type { TeamFeedActivity } from "@/lib/team-feed/activity";

const NAV_COLLAPSED_STORAGE_PREFIX = "sidebar-nav-collapsed";

function navCollapsedStorageKey(profileId: string | null | undefined) {
  return profileId
    ? `${NAV_COLLAPSED_STORAGE_PREFIX}-${profileId}`
    : NAV_COLLAPSED_STORAGE_PREFIX;
}

function readCollapsedGroups(profileId: string | null | undefined): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(navCollapsedStorageKey(profileId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return {};
    const next: Record<string, true> = {};
    for (const id of parsed) {
      if (typeof id === "string" && id) next[id] = true;
    }
    return next;
  } catch {
    return {};
  }
}

function writeCollapsedGroups(
  profileId: string | null | undefined,
  collapsed: Record<string, true>
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      navCollapsedStorageKey(profileId),
      JSON.stringify(Object.keys(collapsed))
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

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
    id: "adoption",
    label: "Adoption",
    items: [
      { href: "/adoption", label: "Adoptable Cats", icon: PawPrint },
      { href: "/adoption/applications", label: "Applications", icon: ClipboardList },
      { href: "/adoption/locations", label: "Locations", icon: MapPin },
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

function isNavItemActive(pathname: string, href: string, allHrefs: string[]): boolean {
  if (pathname === href) return true;
  if (href === "/") return false;
  if (!pathname.startsWith(`${href}/`)) return false;

  // Prefer a more specific sibling (e.g. /adoption/locations over /adoption).
  const hasMoreSpecificMatch = allHrefs.some(
    (other) =>
      other !== href &&
      other.length > href.length &&
      (other.startsWith(`${href}/`) || other.startsWith(href)) &&
      (pathname === other || pathname.startsWith(`${other}/`))
  );
  return !hasMoreSpecificMatch;
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
  adoptionApplicationsActivity?: AdoptionApplicationsActivity | null;
}

export function Sidebar({
  profile,
  userName,
  isAdmin = false,
  previewKey = null,
  roleDescriptions = [],
  teamFeedActivity = null,
  adoptionApplicationsActivity = null,
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, true>>({});
  const { highlightedNav, tourActive } = useTutorialNavigation();
  const showTeamFeedIndicator = useTeamFeedNavIndicator(teamFeedActivity, profile?.id);
  const showAdoptionApplicationsIndicator = useAdoptionApplicationsNavIndicator(
    adoptionApplicationsActivity,
    profile?.id
  );

  const permissions = getProfilePermissions(profile);
  const allowedRoutes = permissions?.routes ?? [];
  const visibleGroups = visibleNavGroups(allowedRoutes);
  const visibleHrefs = visibleGroups.flatMap((group) => group.items.map((item) => item.href));

  useEffect(() => {
    setCollapsedGroups(readCollapsedGroups(profile?.id));
  }, [profile?.id]);

  function toggleGroupCollapsed(groupId: string) {
    setCollapsedGroups((current) => {
      const next = { ...current };
      if (next[groupId]) delete next[groupId];
      else next[groupId] = true;
      writeCollapsedGroups(profile?.id, next);
      return next;
    });
  }

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
          {visibleGroups.map((group) => {
            const tourForceOpen =
              tourActive &&
              Boolean(
                highlightedNav &&
                  highlightedNav !== "sidebar" &&
                  group.items.some((item) => item.href === highlightedNav)
              );
            const collapsed = Boolean(collapsedGroups[group.id]) && !tourForceOpen;
            const hasActiveItem = group.items.some((item) =>
              isNavItemActive(pathname, item.href, visibleHrefs)
            );
            const hasUnreadIndicator = group.items.some(
              (item) =>
                (item.href === "/team-feed" && showTeamFeedIndicator) ||
                (item.href === "/adoption/applications" && showAdoptionApplicationsIndicator)
            );

            return (
              <div key={group.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleGroupCollapsed(group.id)}
                  aria-expanded={!collapsed}
                  className={cn(
                    "flex w-full items-center gap-1 rounded-md px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/70",
                    collapsed && hasActiveItem && "text-sidebar-foreground/70"
                  )}
                >
                  <span className="min-w-0 flex-1">{group.label}</span>
                  {collapsed && (hasActiveItem || hasUnreadIndicator) && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      collapsed && "-rotate-90"
                    )}
                  />
                </button>
                {!collapsed &&
                  group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isNavItemActive(pathname, item.href, visibleHrefs);
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
                        {item.href === "/adoption/applications" &&
                          showAdoptionApplicationsIndicator && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400/75"
                              aria-label="New adoption application"
                            />
                          )}
                      </Link>
                    );
                  })}
              </div>
            );
          })}
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
