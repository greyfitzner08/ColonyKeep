"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Menu,
  X,
  Cat,
  BookOpen,
  Package,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProfilePermissions } from "@/lib/permissions";
import { useTutorialNavigation } from "@/components/platform-tutorial/tutorial-navigation-context";
import type { Profile, RoleDescription } from "@/lib/types";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/layout/logout-button";
import { AdminRolePreviewControl } from "@/components/admin/admin-role-preview";
import { PlatformTutorialTrigger } from "@/components/platform-tutorial/platform-tutorial-trigger";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/intake", label: "Inquiry Queue", icon: Inbox },
  { href: "/trap-queue", label: "Trap Queue", icon: Kanban },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/clinics", label: "Clinics", icon: Building2 },
  { href: "/clinic-events", label: "Clinic Events", icon: Stethoscope },
  { href: "/hotspots", label: "Hotspots Map", icon: Map },
  { href: "/equipment", label: "Equipment", icon: Package },
  { href: "/volunteers", label: "Volunteers", icon: Users },
  { href: "/shift-board", label: "Shift Board", icon: CalendarDays },
  { href: "/team-feed", label: "Team Feed", icon: MessageSquare },
  { href: "/my-impact", label: "My Impact", icon: Heart },
  { href: "/profile", label: "My Profile", icon: UserRound },
  { href: "/resources", label: "Resources", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: Settings },
];

interface SidebarProps {
  profile: Profile | null;
  userName?: string | null;
  isAdmin?: boolean;
  previewKey?: string | null;
  roleDescriptions?: RoleDescription[];
}

export function Sidebar({
  profile,
  userName,
  isAdmin = false,
  previewKey = null,
  roleDescriptions = [],
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { highlightedNav, tourActive } = useTutorialNavigation();

  const permissions = getProfilePermissions(profile);
  const allowedRoutes = permissions?.routes ?? [];
  const visibleItems = NAV_ITEMS.filter((item) =>
    allowedRoutes.some(
      (route) => item.href === route || (route !== "/" && item.href.startsWith(route))
    )
  );

  useEffect(() => {
    if (!tourActive || !highlightedNav || highlightedNav === "sidebar") return;
    const element = document.querySelector(`[data-tutorial-nav="${highlightedNav}"]`);
    element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedNav, tourActive]);

  const nav = (
    <nav className="flex h-full min-h-0 flex-col p-4">
      <div className="mb-6 flex shrink-0 items-center gap-2 px-2">
        <Cat className="h-8 w-8 text-primary" />
        <div>
          <p className="font-semibold text-sidebar-foreground">TNVR Rescue</p>
          <p className="text-xs text-sidebar-foreground/60">Colony Management</p>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto -mx-2 px-2",
          tourActive && highlightedNav === "sidebar" && "rounded-md ring-2 ring-primary ring-offset-2 ring-offset-sidebar"
        )}
      >
        <div className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
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
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
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
                roleDescriptions={roleDescriptions}
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
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X /> : <Menu />}
      </Button>

      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border">
        {nav}
      </aside>

      {mobileOpen && (
        <aside className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative flex h-full w-64 flex-col bg-sidebar">{nav}</div>
        </aside>
      )}
    </>
  );
}
