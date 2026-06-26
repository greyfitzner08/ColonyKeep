"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";

interface TrapQueueFiltersProps {
  teams: { id: string; name: string }[];
  myTeamId: string | null;
  myTeamName?: string | null;
  isTrapRole: boolean;
}

export function TrapQueueFilters({
  teams,
  myTeamId,
  myTeamName,
  isTrapRole,
}: TrapQueueFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? "all";

  function updateView(view: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "all") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    router.push(`/trap-queue?${params.toString()}`);
  }

  return (
    <Select value={currentView} onValueChange={updateView}>
      <SelectTrigger className="w-[260px]">
        <SelectValue placeholder="Select queue" />
      </SelectTrigger>
      <SelectContent>
        {isTrapRole && (
          <SelectItem value="mine">
            {myTeamName ? `My Team (${myTeamName})` : "My Work"}
          </SelectItem>
        )}
        <SelectItem value="unassigned">Unassigned Pool</SelectItem>
        <SelectItem value="all">All Teams</SelectItem>
        {sortTrapTeams(teams).map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.id === myTeamId ? `${team.name} (my team)` : team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
