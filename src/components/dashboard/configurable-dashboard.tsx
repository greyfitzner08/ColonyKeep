"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Calendar, Inbox, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MyShiftsCard } from "@/components/dashboard/my-shifts-card";
import { MyCasesSection } from "@/components/dashboard/my-cases-section";
import { CommunityStatsDisplay, type CommunityStats } from "@/components/dashboard/community-stats-display";
import { TrapTeamPanel } from "@/components/dashboard/trap-team-panel";
import { DashboardSectionShell } from "@/components/dashboard/dashboard-section-shell";
import { formatDate } from "@/lib/utils";
import type { HelpRequest, Shift } from "@/lib/types";
import type { TrapTeamDashboardData } from "@/lib/dashboard/trap-team-data";
import {
  type DashboardSectionId,
  collapsedStorageKey,
  mergeSectionOrder,
  orderStorageKey,
  trapTeamStorageKey,
} from "@/lib/dashboard/sections";

interface ConfigurableDashboardProps {
  profileId: string;
  userName: string;
  quickLinks: {
    intake: boolean;
    trap: boolean;
    appointments: boolean;
  };
  isAdmin: boolean;
  sections: {
    communityStats: boolean;
    overdueFollowUps: boolean;
    shifts: boolean;
    myCases: boolean;
    myTrapWork: boolean;
    trapTeam: boolean;
    appointments: boolean;
    adminHint: boolean;
  };
  overdueFollowUps: { id: string; case_number: string; follow_up_due_date: string }[];
  myShifts: Shift[];
  myCases: HelpRequest[];
  teamCases: HelpRequest[];
  userEmail: string;
  intakeWorker: boolean;
  trapWorker: boolean;
  trapTeamDescription: string;
  trapTeams: { id: string; name: string }[];
  trapTeamData: TrapTeamDashboardData | null;
  initialTrapTeamId: string | null;
  pendingAppointments: number;
  communityStats: CommunityStats | null;
}

const QUICK_LINKS = [
  { key: "intake" as const, href: "/intake", label: "Intake Queue", icon: Inbox },
  { key: "trap" as const, href: "/trap-queue", label: "Trap Queue", icon: Kanban },
  { key: "appointments" as const, href: "/appointments", label: "Appointments", icon: Calendar },
];

function readStoredOrder(profileId: string): DashboardSectionId[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(orderStorageKey(profileId));
    return raw ? (JSON.parse(raw) as DashboardSectionId[]) : null;
  } catch {
    return null;
  }
}

function readStoredCollapsed(profileId: string): Partial<Record<DashboardSectionId, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(collapsedStorageKey(profileId));
    return raw ? (JSON.parse(raw) as Partial<Record<DashboardSectionId, boolean>>) : {};
  } catch {
    return {};
  }
}

export function ConfigurableDashboard({
  profileId,
  userName,
  quickLinks,
  isAdmin,
  sections,
  overdueFollowUps,
  myShifts,
  myCases,
  teamCases,
  userEmail,
  intakeWorker,
  trapWorker,
  trapTeamDescription,
  trapTeams,
  trapTeamData,
  initialTrapTeamId,
  pendingAppointments,
  communityStats,
}: ConfigurableDashboardProps) {
  const visibleSectionIds = useMemo(() => {
    const ids: DashboardSectionId[] = [];
    if (sections.overdueFollowUps) ids.push("overdue-followups");
    if (sections.shifts) ids.push("shifts");
    if (sections.myCases) ids.push("my-cases");
    if (sections.myTrapWork) ids.push("my-trap-work");
    if (sections.trapTeam) ids.push("trap-team");
    if (sections.communityStats) ids.push("community-stats");
    if (sections.appointments) ids.push("appointments");
    if (sections.adminHint) ids.push("admin-hint");
    return ids;
  }, [sections]);

  const [order, setOrder] = useState<DashboardSectionId[]>(visibleSectionIds);
  const [collapsed, setCollapsed] = useState<Partial<Record<DashboardSectionId, boolean>>>({});
  const [draggedId, setDraggedId] = useState<DashboardSectionId | null>(null);
  const [dropTargetId, setDropTargetId] = useState<DashboardSectionId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedOrder = readStoredOrder(profileId);
    setOrder(mergeSectionOrder(visibleSectionIds, savedOrder));
    setCollapsed(readStoredCollapsed(profileId));
    setHydrated(true);
  }, [profileId, visibleSectionIds]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(orderStorageKey(profileId), JSON.stringify(order));
  }, [order, profileId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(collapsedStorageKey(profileId), JSON.stringify(collapsed));
  }, [collapsed, profileId, hydrated]);

  useEffect(() => {
    if (!initialTrapTeamId || typeof window === "undefined") return;
    localStorage.setItem(trapTeamStorageKey(profileId), initialTrapTeamId);
  }, [initialTrapTeamId, profileId]);

  const toggleCollapsed = useCallback((id: DashboardSectionId) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleDrop = useCallback(
    (targetId: DashboardSectionId) => {
      if (!draggedId || draggedId === targetId) {
        setDraggedId(null);
        setDropTargetId(null);
        return;
      }

      setOrder((prev) => {
        const next = [...prev];
        const fromIndex = next.indexOf(draggedId);
        const toIndex = next.indexOf(targetId);
        if (fromIndex === -1 || toIndex === -1) return prev;
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, draggedId);
        return next;
      });
      setDraggedId(null);
      setDropTargetId(null);
    },
    [draggedId]
  );

  function renderSection(id: DashboardSectionId) {
    switch (id) {
      case "community-stats":
        return communityStats ? <CommunityStatsDisplay stats={communityStats} /> : null;
      case "overdue-followups":
        return (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Your Overdue Follow-ups ({overdueFollowUps.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overdueFollowUps.slice(0, 5).map((hr) => (
                  <Link
                    key={hr.id}
                    href={`/case/${hr.id}`}
                    className="flex items-center justify-between text-sm hover:underline"
                  >
                    <span>{hr.case_number}</span>
                    <Badge variant="outline" className="text-orange-600">
                      Due {formatDate(hr.follow_up_due_date)}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case "shifts":
        return <MyShiftsCard shifts={myShifts} />;
      case "my-cases":
        return (
          <MyCasesSection
            title="My Cases"
            description="Intake work you personally claimed from the queue. These are your assigned follow-ups — not trap-team field work. Medical cases are pinned to the top."
            cases={myCases}
            emptyMessage="You have not claimed any open cases yet."
            showClaimHint
            canClaim={intakeWorker}
            userEmail={userEmail}
          />
        );
      case "my-trap-work":
        return (
          <MyCasesSection
            title="My Trap Work"
            description={trapTeamDescription}
            cases={teamCases}
            emptyMessage="No team or personal trap cases right now."
            showClaimHint
            hintHref="/trap-queue"
            hintLabel="Open trap queue"
            canClaim={trapWorker}
            userEmail={userEmail}
          />
        );
      case "trap-team":
        return (
          <TrapTeamPanel
            profileId={profileId}
            isAdmin={isAdmin}
            teams={trapTeams}
            initialTeamId={initialTrapTeamId}
            initialData={trapTeamData}
          />
        );
      case "appointments":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Clinic Coordination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-bold">{pendingAppointments}</p>
              <p className="text-sm text-muted-foreground">Reserved appointments awaiting action</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/appointments">Open appointments</Link>
              </Button>
            </CardContent>
          </Card>
        );
      case "admin-hint":
        return (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Claim cases from the intake queue to track them here, or use import on the intake page
              to bulk-add cases.
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Drag sections by the handle to reorder. Collapse any section you don&apos;t need right now.
          </p>
        </div>
        {QUICK_LINKS.some((link) => quickLinks[link.key]) && (
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.filter((link) => quickLinks[link.key]).map((link) => {
              const Icon = link.icon;
              return (
                <Button key={link.href} asChild variant="outline">
                  <Link href={link.href}>
                    <Icon className="h-4 w-4 mr-2" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {order
          .filter((id) => visibleSectionIds.includes(id))
          .map((id) => (
            <DashboardSectionShell
              key={id}
              id={id}
              collapsed={Boolean(collapsed[id])}
              onToggleCollapsed={toggleCollapsed}
              onDragStart={setDraggedId}
              onDragOver={() => setDropTargetId(id)}
              onDrop={handleDrop}
              isDragging={draggedId === id}
              isDropTarget={dropTargetId === id && draggedId !== id}
            >
              {renderSection(id)}
            </DashboardSectionShell>
          ))}
      </div>
    </div>
  );
}
