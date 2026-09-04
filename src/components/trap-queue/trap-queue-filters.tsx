"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";

interface TrapQueueFiltersProps {
  teams: { id: string; name: string }[];
  myTeamId: string | null;
  myTeamName?: string | null;
  isTrapRole: boolean;
  showWorkHistory?: boolean;
}

export function TrapQueueFilters({
  teams,
  myTeamId,
  myTeamName,
  isTrapRole,
  showWorkHistory = false,
}: TrapQueueFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") === "history" ? "history" : "queue";
  const currentView = searchParams.get("view") ?? "all";

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`/trap-queue?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {showWorkHistory && (
        <Select
          value={scope}
          onValueChange={(value) =>
            updateParams((params) => {
              if (value === "history") {
                params.set("scope", "history");
                params.delete("view");
              } else {
                params.delete("scope");
              }
            })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="queue">Trap queue</SelectItem>
            <SelectItem value="history">My work history</SelectItem>
          </SelectContent>
        </Select>
      )}

      {scope !== "history" && (
        <Select
          value={currentView}
          onValueChange={(view) =>
            updateParams((params) => {
              if (view === "all") {
                params.delete("view");
              } else {
                params.set("view", view);
              }
            })
          }
        >
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Select queue" />
          </SelectTrigger>
          <SelectContent>
            {isTrapRole && (
              <SelectItem value="mine">
                {myTeamName ? `My Team (${myTeamName})` : "My Work"}
              </SelectItem>
            )}
            <SelectItem value="unassigned">No team</SelectItem>
            <SelectItem value="all">All Teams</SelectItem>
            {sortTrapTeams(teams).map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.id === myTeamId ? `${team.name} (my team)` : team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
