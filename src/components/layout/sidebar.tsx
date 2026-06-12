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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_PERMISSIONS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/intake", label: "Intake Queue", icon: Inbox },
  { href: "/trap-queue", label: "Trap Queue", icon: Kanban },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/clinics", label: "Clinics", icon: Building2 },
  { href: "/clinic-events", label: "Clinic Events", icon: Stethoscope },
  { href: "/hotspots", label: "Hotspots Map", icon: Map },
  { href: "/volunteers", label: "Volunteers", icon: Users },
  { href: "/shift-board", label: "Shift Board", icon: CalendarDays },
  { href: "/team-feed", label: "Team Feed", icon: MessageSquare },
  { href: "/team-dashboard", label: "Team Dashboard", icon: Users },
  { href: "/my-impact", label: "My Impact", icon: Heart },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: Settings },
];

interface SidebarProps {
  role: UserRole | null;
  userName?: string | null;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allowedRoutes = role ? ROLE_PERMISSIONS[role].routes : [];
  const visibleItems = NAV_ITEMS.filter((item) =>
    allowedRoutes.some(
      (route) => item.href === route || (route !== "/" && item.href.startsWith(route))
    )
  );

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Cat className="h-8 w-8 text-primary" />
        <div>
          <p className="font-semibold text-sidebar-foreground">TNVR Rescue</p>
          <p className="text-xs text-sidebar-foreground/60">Colony Management</p>
        </div>
      </div>
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      {userName && (
        <div className="mt-auto border-t border-sidebar-border pt-4 px-2">
          <p className="text-xs text-sidebar-foreground/60">Signed in as</p>
          <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
          {role && (
            <p className="text-xs text-sidebar-foreground/60">{ROLE_PERMISSIONS[role].label}</p>
          )}
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

      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
        {nav}
      </aside>

      {mobileOpen && (
        <aside className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative flex w-64 flex-col bg-sidebar">{nav}</div>
        </aside>
      )}
    </>
  );
}
