"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { volunteerRoleLabel } from "@/lib/volunteers/role-catalog";
import { cn } from "@/lib/utils";
import type { RoleDescription, VolunteerRole } from "@/lib/types";

interface VolunteerRoleCheckboxListProps {
  entries: RoleDescription[];
  selectedRoles: VolunteerRole[];
  onToggle: (roleId: VolunteerRole) => void;
  idPrefix: string;
  roleCatalog?: RoleDescription[];
  renderMeta?: (entry: RoleDescription, selected: boolean) => React.ReactNode;
}

export function VolunteerRoleCheckboxList({
  entries,
  selectedRoles,
  onToggle,
  idPrefix,
  roleCatalog,
  renderMeta,
}: VolunteerRoleCheckboxListProps) {
  const [expandedRoles, setExpandedRoles] = useState<Set<VolunteerRole>>(() => new Set());

  function toggleDescription(roleId: VolunteerRole) {
    setExpandedRoles((current) => {
      const next = new Set(current);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  return (
    <div className="rounded-md border divide-y">
      {entries.map((entry) => {
        const selected = selectedRoles.includes(entry.role_id);
        const expanded = expandedRoles.has(entry.role_id);
        const description = entry.description?.trim();
        const label = volunteerRoleLabel(entry.role_id, roleCatalog ?? entries);
        const meta = renderMeta?.(entry, selected);

        return (
          <div key={entry.role_id} className={cn(selected && "bg-primary/5")}>
            <div className="flex items-center gap-2 px-3 py-2">
              <Checkbox
                id={`${idPrefix}-${entry.role_id}`}
                checked={selected}
                onCheckedChange={() => onToggle(entry.role_id)}
              />
              <label
                htmlFor={`${idPrefix}-${entry.role_id}`}
                className="min-w-0 flex-1 cursor-pointer text-sm font-medium leading-snug"
              >
                {label}
              </label>
              {description && (
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => toggleDescription(entry.role_id)}
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Hide" : "Show"} description for ${label}`}
                >
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                  />
                </button>
              )}
            </div>
            {(expanded && description) || meta ? (
              <div className="space-y-1 px-3 pb-2.5 pl-9">
                {expanded && description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
                {meta}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
