"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TeamEligibleVolunteer } from "@/lib/volunteers/eligibility";
import { Search } from "lucide-react";

interface VolunteerTeamPickerProps {
  eligibleVolunteers: TeamEligibleVolunteer[];
  assignedEmails: string[];
  onAssign: (userId: string) => Promise<void>;
  disabled?: boolean;
}

export function VolunteerTeamPicker({
  eligibleVolunteers,
  assignedEmails,
  onAssign,
  disabled = false,
}: VolunteerTeamPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const assignedSet = useMemo(
    () => new Set(assignedEmails.map((email) => email.toLowerCase())),
    [assignedEmails]
  );

  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return eligibleVolunteers.filter(({ profile }) => {
      if (assignedSet.has(profile.email.toLowerCase())) return false;
      if (!normalizedQuery) return true;
      const haystack = `${profile.full_name ?? ""} ${profile.email}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [assignedSet, eligibleVolunteers, query]);

  async function handleAssign(userId: string) {
    setAssigningId(userId);
    await onAssign(userId);
    setAssigningId(null);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search approved volunteers to add..."
          className="pl-9"
          disabled={disabled}
        />
      </div>
      {open && !disabled && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close volunteer search"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No eligible volunteers match your search.
              </p>
            ) : (
              options.map(({ profile }) => (
                <button
                  key={profile.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => handleAssign(profile.id)}
                  disabled={assigningId === profile.id}
                >
                  <span>
                    <span className="font-medium">{profile.full_name ?? profile.email}</span>
                    {profile.full_name && (
                      <span className="block text-xs text-muted-foreground">{profile.email}</span>
                    )}
                  </span>
                  <span className="text-xs text-primary">
                    {assigningId === profile.id ? "Adding..." : "Add"}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
      {query && open && options.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 px-0"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
        >
          Clear search
        </Button>
      )}
    </div>
  );
}
