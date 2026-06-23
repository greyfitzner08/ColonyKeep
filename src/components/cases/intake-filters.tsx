"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusOptionsForRole } from "@/lib/cases/statuses";

interface IntakeFiltersProps {
  teams: { id: string; name: string }[];
}

export function IntakeFilters({ teams }: IntakeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intakeStatuses = getStatusOptionsForRole("inquiry_team");

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/intake?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => updateFilter("status", v)}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Intake Statuses</SelectItem>
          {intakeStatuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("team") ?? "all"} onValueChange={(v) => updateFilter("team", v)}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Team" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teams</SelectItem>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("medical") ?? "all"} onValueChange={(v) => updateFilter("medical", v)}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Medical" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Cases</SelectItem>
          <SelectItem value="true">Medical Flags Only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
