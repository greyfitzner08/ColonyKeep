"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import {
  getRoleRequirement,
  missingRequirementsForRole,
  requirementLabel,
  type RequirementField,
} from "@/lib/volunteers/role-requirements";
import { formatDate } from "@/lib/utils";
import type { VolunteerRole, VolunteerRoleRequest } from "@/lib/types";
import { Check, X } from "lucide-react";

interface VolunteerRoleRequestsPanelProps {
  requests: VolunteerRoleRequest[];
}

function roleLabel(role: VolunteerRole) {
  return VOLUNTEER_ROLES.find((entry) => entry.value === role)?.label ?? role;
}

function requirementFieldsForRoles(roles: VolunteerRole[]): RequirementField[] {
  const fields = new Set<RequirementField>();
  for (const role of roles) {
    for (const field of getRoleRequirement(role)?.requires ?? []) {
      fields.add(field);
    }
  }
  return Array.from(fields);
}

export function VolunteerRoleRequestsPanel({ requests }: VolunteerRoleRequestsPanelProps) {
  const router = useRouter();
  const pending = requests.filter((request) => request.status === "pending");
  const [actingId, setActingId] = useState<string | null>(null);
  const [updatingField, setUpdatingField] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [requirementState, setRequirementState] = useState<Record<string, VolunteerRoleRequest>>({});

  if (pending.length === 0) return null;

  function requestState(request: VolunteerRoleRequest) {
    return requirementState[request.id] ?? request;
  }

  async function updateRequirement(
    requestId: string,
    field: RequirementField,
    value: boolean
  ) {
    setError(null);
    setUpdatingField(`${requestId}:${field}`);
    const response = await fetch("/api/volunteers/role-requests/update-requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, field, value }),
    });
    const result = await response.json().catch(() => null);
    setUpdatingField(null);

    if (!response.ok) {
      setError(result?.error ?? "Unable to update requirement");
      return;
    }

    setRequirementState((prev) => ({
      ...prev,
      [requestId]: result.request as VolunteerRoleRequest,
    }));
    router.refresh();
  }

  async function reviewRequest(requestId: string, action: "approve" | "reject") {
    setError(null);
    setActingId(requestId);
    const response = await fetch("/api/volunteers/role-requests/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_id: requestId,
        action,
        admin_notes: notes[requestId] ?? null,
      }),
    });
    const result = await response.json().catch(() => null);
    setActingId(null);
    if (!response.ok) {
      setError(result?.error ?? "Unable to review role request");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-lg">
          {pending.some((r) => (r.request_type ?? "add") === "remove")
            ? "Pending role change requests"
            : "Pending role expansion requests"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Check off each requirement after you verify it. New trapping-related roles always start
          without TNVR certificate or shadow credit — confirm those manually before approving.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {pending.map((request) => {
          const state = requestState(request);
          const allReady = request.requested_roles.every(
            (role) => missingRequirementsForRole(role, state).length === 0
          );
          const isRemoval = (request.request_type ?? "add") === "remove";
          const requirementFields = requirementFieldsForRoles(request.requested_roles);

          return (
            <div key={request.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{request.full_name ?? request.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.email} · {(request.request_type ?? "add") === "remove" ? "Removal" : "Addition"} ·{" "}
                    Requested {formatDate(request.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {request.requested_roles.map((role) => (
                    <Badge
                      key={role}
                      variant={(request.request_type ?? "add") === "remove" ? "destructive" : "default"}
                    >
                      {roleLabel(role)}
                    </Badge>
                  ))}
                </div>
              </div>

              {!isRemoval && requirementFields.length > 0 && (
                <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                  <p className="text-sm font-medium">Verify requirements</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {requirementFields.map((field) => (
                      <label
                        key={field}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={Boolean(state[field])}
                          disabled={updatingField === `${request.id}:${field}`}
                          onCheckedChange={(checked) =>
                            updateRequirement(request.id, field, Boolean(checked))
                          }
                        />
                        <span>{requirementLabel(field)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {request.requested_roles.map((role) => {
                  const missing = missingRequirementsForRole(role, state);
                  const ready = missing.length === 0;
                  return (
                    <div
                      key={role}
                      className={`rounded-md border px-3 py-2 ${ready ? "bg-green-50" : "bg-amber-50"}`}
                    >
                      <p className="font-medium">{roleLabel(role)}</p>
                      {ready ? (
                        <p className="text-muted-foreground">Ready to approve</p>
                      ) : (
                        <p className="text-muted-foreground">
                          Still need: {missing.map(requirementLabel).join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`role-notes-${request.id}`}>Admin notes (optional)</Label>
                <Textarea
                  id={`role-notes-${request.id}`}
                  rows={2}
                  value={notes[request.id] ?? ""}
                  onChange={(event) =>
                    setNotes((prev) => ({ ...prev, [request.id]: event.target.value }))
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={actingId === request.id || (!isRemoval && !allReady)}
                  onClick={() => reviewRequest(request.id, "approve")}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {actingId === request.id
                    ? "Working…"
                    : isRemoval
                      ? "Approve removal"
                      : allReady
                        ? "Approve roles"
                        : "Verify requirements first"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={actingId === request.id}
                  onClick={() => reviewRequest(request.id, "reject")}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
