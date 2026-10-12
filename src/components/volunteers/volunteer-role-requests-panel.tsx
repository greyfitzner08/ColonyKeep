"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { createClient } from "@/lib/supabase/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { VolunteerRole, VolunteerRoleRequest } from "@/lib/types";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";

const COLLAPSED_STORAGE_KEY = "volunteers-role-requests-collapsed";
const SNOOZED_UNTIL_STORAGE_KEY = "volunteers-role-requests-snoozed-until";

interface VolunteerRoleRequestsPanelProps {
  requests: VolunteerRoleRequest[];
}

function endOfLocalDayIso() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

function readCollapsedPreference() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readSnoozedUntil() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SNOOZED_UNTIL_STORAGE_KEY);
    if (!raw) return null;
    const until = new Date(raw);
    if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
      window.localStorage.removeItem(SNOOZED_UNTIL_STORAGE_KEY);
      return null;
    }
    return until.toISOString();
  } catch {
    return null;
  }
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
  const [uploadingCertId, setUploadingCertId] = useState<string | null>(null);
  const [openingCertId, setOpeningCertId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [requirementState, setRequirementState] = useState<Record<string, VolunteerRoleRequest>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<string | null>(null);
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsedPreference());
    setSnoozedUntil(readSnoozedUntil());
    setPrefsReady(true);
  }, []);

  function setCollapsedPreference(next: boolean) {
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage failures (private mode, etc.).
    }
  }

  function snoozeForToday() {
    const until = endOfLocalDayIso();
    setSnoozedUntil(until);
    setCollapsedPreference(true);
    try {
      window.localStorage.setItem(SNOOZED_UNTIL_STORAGE_KEY, until);
    } catch {
      // Ignore storage failures.
    }
  }

  function clearSnooze() {
    setSnoozedUntil(null);
    setCollapsedPreference(false);
    try {
      window.localStorage.removeItem(SNOOZED_UNTIL_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  if (pending.length === 0) return null;

  const title = pending.some((r) => (r.request_type ?? "add") === "remove")
    ? "Pending role change requests"
    : "Pending role expansion requests";
  const isSnoozed = Boolean(snoozedUntil && new Date(snoozedUntil).getTime() > Date.now());

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

  async function uploadCertificate(
    requestId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingCertId(requestId);

    const supabase = createClient();
    const path = `role-requests/${requestId}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error: uploadError } = await supabase.storage.from("certificates").upload(path, file);

    if (uploadError) {
      setUploadingCertId(null);
      setError(uploadError.message);
      return;
    }

    const response = await fetch("/api/volunteers/role-requests/certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, certificate_url: path }),
    });
    const result = await response.json().catch(() => null);
    setUploadingCertId(null);

    if (!response.ok) {
      setError(getApiErrorMessage(result, "Certificate uploaded but could not be saved"));
      return;
    }

    event.target.value = "";
    setRequirementState((prev) => ({
      ...prev,
      [requestId]: result.request as VolunteerRoleRequest,
    }));
    router.refresh();
  }

  async function openCertificate(requestId: string, certificateUrl: string) {
    setError(null);
    setOpeningCertId(requestId);

    const response = await fetch(
      `/api/volunteers/application-certificate?path=${encodeURIComponent(certificateUrl)}`
    );
    const result = await response.json().catch(() => null);
    setOpeningCertId(null);

    if (!response.ok || !result?.url) {
      setError(getApiErrorMessage(result, "Could not open certificate"));
      return;
    }

    window.open(result.url, "_blank", "noopener,noreferrer");
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

  // Avoid a full-panel flash before local preferences load.
  if (!prefsReady) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          <Badge variant="secondary">{pending.length}</Badge>
        </div>
      </div>
    );
  }

  if (isSnoozed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-2.5">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{pending.length}</span> pending role{" "}
          {pending.length === 1 ? "request" : "requests"} snoozed until tomorrow
        </p>
        <Button type="button" size="sm" variant="outline" onClick={clearSnooze}>
          Show requests
        </Button>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-card px-4 py-3 shadow-sm">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setCollapsedPreference(false)}
        >
          <p className="truncate text-sm font-medium">{title}</p>
          <Badge variant="secondary">{pending.length}</Badge>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={snoozeForToday}>
            Snooze today
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setCollapsedPreference(false)}>
            Expand
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              {title}
              <Badge variant="secondary">{pending.length}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Check off each requirement after you verify it. New trapping-related roles always start
              without TNVR certificate or shadow credit — confirm those manually before approving.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={snoozeForToday}>
              Snooze today
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCollapsedPreference(true)}
            >
              <ChevronUp className="mr-1 h-4 w-4" />
              Minimize
            </Button>
          </div>
        </div>
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
          const needsCertificate = requirementFields.includes("tnvr_certificate_uploaded");
          const certFileName = state.tnvr_certificate_url?.split("/").pop() ?? null;
          const hasCert = Boolean(state.tnvr_certificate_uploaded && state.tnvr_certificate_url);

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

              {!isRemoval && needsCertificate && (
                <div className="space-y-2 rounded-md border border-dashed p-3">
                  <p className="text-sm font-medium">TNVR certificate file</p>
                  <p className="text-xs text-muted-foreground">
                    Upload the volunteer&apos;s certificate here, or check &quot;TNVR certificate&quot;
                    above after verifying an existing file.
                  </p>
                  {hasCert ? (
                    <p className="text-sm text-green-700">
                      Certificate on file{certFileName ? `: ${certFileName}` : ""}.
                    </p>
                  ) : (
                    <p className="text-sm text-amber-700">No certificate file uploaded yet.</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {state.tnvr_certificate_url ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={openingCertId === request.id}
                        onClick={() => openCertificate(request.id, state.tnvr_certificate_url!)}
                      >
                        {openingCertId === request.id ? "Opening…" : "View certificate"}
                      </Button>
                    ) : null}
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={uploadingCertId === request.id}
                      className="max-w-xs"
                      onChange={(event) => uploadCertificate(request.id, event)}
                    />
                  </div>
                  {uploadingCertId === request.id ? (
                    <p className="text-xs text-muted-foreground">Uploading…</p>
                  ) : null}
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

              <div className="space-y-1.5">
                <Label htmlFor={`role-notes-${request.id}`}>Admin notes (optional)</Label>
                <Input
                  id={`role-notes-${request.id}`}
                  value={notes[request.id] ?? ""}
                  onChange={(event) =>
                    setNotes((prev) => ({ ...prev, [request.id]: event.target.value }))
                  }
                  placeholder="Optional note"
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
