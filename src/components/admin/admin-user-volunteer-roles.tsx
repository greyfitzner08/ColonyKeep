"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import type { Profile, VolunteerRole } from "@/lib/types";

interface AdminUserVolunteerRolesProps {
  user: Profile;
  onError: (message: string | null) => void;
}

function roleLabel(role: VolunteerRole) {
  return VOLUNTEER_ROLES.find((entry) => entry.value === role)?.label ?? role;
}

export function AdminUserVolunteerRoles({ user, onError }: AdminUserVolunteerRolesProps) {
  const router = useRouter();
  const approvedRoles = useMemo(() => user.volunteer_roles ?? [], [user.volunteer_roles]);
  const [selectedRoles, setSelectedRoles] = useState<VolunteerRole[]>(approvedRoles);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedRoles(approvedRoles);
  }, [approvedRoles, user.id]);

  const hasChanges =
    selectedRoles.length !== approvedRoles.length ||
    selectedRoles.some((role) => !approvedRoles.includes(role));

  function toggleRole(role: VolunteerRole) {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  }

  async function saveRoles() {
    setSaving(true);
    onError(null);

    const response = await fetch("/api/admin/profiles/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        volunteer_roles: selectedRoles,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      onError(result?.error ?? "Unable to update volunteer roles");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Volunteer roles</p>
          <p className="text-xs text-muted-foreground">
            A user can hold multiple volunteer interests in addition to their platform role.
          </p>
        </div>
        {approvedRoles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {approvedRoles.map((role) => (
              <Badge key={role} variant="secondary">
                {roleLabel(role)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {VOLUNTEER_ROLES.map(({ value, label }) => (
          <div key={value} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Checkbox
              id={`${user.id}-${value}`}
              checked={selectedRoles.includes(value)}
              onCheckedChange={() => toggleRole(value)}
            />
            <Label htmlFor={`${user.id}-${value}`} className="text-sm font-normal leading-snug">
              {label}
            </Label>
          </div>
        ))}
      </div>

      <Button type="button" size="sm" disabled={!hasChanges || saving} onClick={saveRoles}>
        {saving ? "Saving…" : "Save volunteer roles"}
      </Button>
    </div>
  );
}
