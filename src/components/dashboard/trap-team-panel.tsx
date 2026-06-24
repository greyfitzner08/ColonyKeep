"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import type { TrapTeamDashboardData } from "@/lib/dashboard/trap-team-data";
import { trapTeamStorageKey } from "@/lib/dashboard/sections";
import { UnclaimedTeamAssignments } from "@/components/dashboard/unclaimed-team-assignments";
import { Kanban, Users } from "lucide-react";

interface TrapTeamPanelProps {
  profileId: string;
  isAdmin: boolean;
  teams: { id: string; name: string }[];
  initialTeamId: string | null;
  initialData: TrapTeamDashboardData | null;
}

export function TrapTeamPanel({
  profileId,
  isAdmin,
  teams,
  initialTeamId,
  initialData,
}: TrapTeamPanelProps) {
  const [teamId, setTeamId] = useState(initialTeamId ?? teams[0]?.id ?? "");
  const [data, setData] = useState<TrapTeamDashboardData | null>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin || typeof window === "undefined") return;
    const saved = localStorage.getItem(trapTeamStorageKey(profileId));
    if (saved && teams.some((team) => team.id === saved)) {
      setTeamId(saved);
    }
  }, [isAdmin, profileId, teams]);

  useEffect(() => {
    if (!teamId) return;
    if (teamId === initialTeamId && initialData) {
      setData(initialData);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/dashboard/trap-team?team=${teamId}`)
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        setData(result.data ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId, initialTeamId, initialData]);

  function handleTeamChange(nextTeamId: string) {
    setTeamId(nextTeamId);
    if (typeof window !== "undefined") {
      localStorage.setItem(trapTeamStorageKey(profileId), nextTeamId);
    }
  }

  const memberEntries = useMemo(() => {
    if (!data) return [];
    return data.team.members.map((email) => ({
      email,
      ...data.casesByMember[email],
    }));
  }, [data]);

  if (!teamId && teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Trap Team
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No trap teams configured yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {data?.team.name ?? "Trap Team"}
            </CardTitle>
            {data && (
              <p className="text-sm text-muted-foreground mt-1">
                {data.team.region ? `${data.team.region} · ` : ""}
                Lead: {data.team.lead_email}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && teams.length > 1 && (
              <Select value={teamId} onValueChange={handleTeamChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/trap-queue">
                <Kanban className="h-4 w-4 mr-2" />
                Open trap queue
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && <p className="text-sm text-muted-foreground">Loading team data…</p>}

        {!loading && data && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="text-2xl font-bold">{data.stats.memberCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Active cases</p>
                <p className="text-2xl font-bold">{data.stats.activeCases}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Recent hours</p>
                <p className="text-2xl font-bold">{data.stats.totalHours.toFixed(1)}</p>
              </div>
            </div>

            <UnclaimedTeamAssignments cases={data.unclaimedCases} />

            <div className="space-y-4">
              <p className="text-sm font-medium">Who is working on what</p>
              {memberEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">No members listed on this team yet.</p>
              )}
              {memberEntries.map(({ email, displayName, cases }) => (
                <div key={email} className="space-y-2">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                  {cases.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-2">No claimed cases right now.</p>
                  ) : (
                    <div className="space-y-1 pl-2">
                      {cases.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                          <Link href={`/case/${c.id}`} className="text-primary hover:underline">
                            {c.case_number}
                          </Link>
                          <Badge variant="secondary">{c.status.replace(/_/g, " ")}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">Member hours</p>
                {Object.entries(data.hoursByMember).map(([email, hrs]) => (
                  <div key={email} className="flex justify-between text-sm">
                    <span className="truncate pr-2">{email}</span>
                    <span className="font-medium shrink-0">{hrs.toFixed(1)} hrs</span>
                  </div>
                ))}
                {Object.keys(data.hoursByMember).length === 0 && (
                  <p className="text-sm text-muted-foreground">No hours logged yet.</p>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">Recent team feed posts</p>
                {data.announcements.map((post) => (
                  <div key={post.id} className="text-sm border-b pb-2 last:border-0">
                    <p className="line-clamp-2">{post.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(post.created_at)}</p>
                  </div>
                ))}
                {data.announcements.length === 0 && (
                  <p className="text-sm text-muted-foreground">No team-only posts yet.</p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
