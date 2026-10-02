"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldControl } from "@/components/adoption/entrance-application-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CardsTableToggle,
  type CardsTableViewMode,
} from "@/components/ui/cards-table-toggle";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ENTRANCE_SECTIONS,
  emptyEntranceAnswers,
  applyEntranceAddress,
  applyEntranceAnswer,
  entranceFieldGroupClass,
  entranceFieldGroups,
  entranceFieldLabel,
  entranceFieldSpansRow,
  entranceReviewStatusLabel,
  petStoreDisplayName,
  type AdoptionEntranceApplication,
  type EntranceAnswers,
  type EntranceReviewStatus,
} from "@/lib/adoption/entrance";

function statusClass(status: EntranceReviewStatus): string {
  if (status === "approved") return "border-transparent bg-emerald-100 text-emerald-900";
  if (status === "denied") return "border-transparent bg-red-100 text-red-900";
  return "border-transparent bg-amber-100 text-amber-950";
}

function locationLabel(application: AdoptionEntranceApplication): string {
  const answers = application.answers;
  const foster =
    answers.foster_name?.trim() ||
    answers.location_contact_name?.trim() ||
    answers.location_name?.trim() ||
    "";
  const store = petStoreDisplayName(answers);
  if (foster && store) return `${foster} · ${store}`;
  return foster || store || "—";
}

export function EntranceReviewManager({
  applications,
  onApproved,
}: {
  applications: AdoptionEntranceApplication[];
  onApproved?: () => void;
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<CardsTableViewMode>("cards");
  const [openId, setOpenId] = useState<string | null>(applications[0]?.id ?? null);
  const [sectionId, setSectionId] = useState(ENTRANCE_SECTIONS[0]?.id ?? "profile");
  const [drafts, setDrafts] = useState<Record<string, EntranceAnswers>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denialInvalidId, setDenialInvalidId] = useState<string | null>(null);

  function answersFor(application: AdoptionEntranceApplication): EntranceAnswers {
    return drafts[application.id] ?? { ...emptyEntranceAnswers(), ...application.answers };
  }

  function updateAddress(
    applicationId: string,
    base: EntranceAnswers,
    key: string,
    parts: { address: string; city: string; state: string; zip: string }
  ) {
    setSavedId(null);
    setDrafts((current) => ({
      ...current,
      [applicationId]: applyEntranceAddress(current[applicationId] ?? base, key, parts),
    }));
  }

  function updateAnswer(applicationId: string, base: EntranceAnswers, key: string, value: string) {
    setSavedId(null);
    setDrafts((current) => ({
      ...current,
      [applicationId]: applyEntranceAnswer(current[applicationId] ?? base, key, value),
    }));
  }

  async function saveAnswers(application: AdoptionEntranceApplication) {
    setError(null);
    setSavedId(null);
    setBusyId(application.id);
    try {
      const response = await fetch("/api/adoption/entrance/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: application.id, answers: answersFor(application) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to save these answers.");
        return;
      }
      if (result?.answers) {
        setDrafts((current) => ({ ...current, [application.id]: result.answers }));
      }
      setSavedId(application.id);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function decide(application: AdoptionEntranceApplication, decision: "approved" | "denied") {
    setError(null);
    const denialReason = reasons[application.id]?.trim() ?? "";
    if (decision === "denied" && !denialReason) {
      setDenialInvalidId(application.id);
      setError("Enter why this cat was declined so the decision is clear.");
      setOpenId(application.id);
      return;
    }
    setDenialInvalidId(null);
    setBusyId(application.id);
    try {
      const response = await fetch("/api/adoption/entrance/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: application.id,
          decision,
          denial_reason: denialReason,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to save this decision.");
        return;
      }
      if (decision === "approved") onApproved?.();
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<DataTableColumn<AdoptionEntranceApplication>[]>(
    () => [
      {
        id: "cat",
        label: "Cat",
        sortValue: (row) => row.cat_name,
        render: (row) => <p className="font-medium">{row.cat_name}</p>,
      },
      {
        id: "status",
        label: "Status",
        sortValue: (row) => row.status,
        render: (row) => (
          <Badge variant="outline" className={statusClass(row.status)}>
            {entranceReviewStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        id: "location",
        label: "Location",
        sortValue: (row) => locationLabel(row),
        render: (row) => <span className="text-sm">{locationLabel(row)}</span>,
      },
      {
        id: "submitted",
        label: "Submitted",
        sortValue: (row) => row.created_at,
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.created_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        label: "Actions",
        hideable: false,
        render: (row) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpenId((current) => (current === row.id ? null : row.id))}
          >
            {openId === row.id ? "Hide" : "Review"}
          </Button>
        ),
      },
    ],
    [openId]
  );

  if (applications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rescue applications are waiting for review. Approved cats are listed under Cats.
      </p>
    );
  }

  const openApplication = openId
    ? applications.find((application) => application.id === openId) ?? null
    : null;

  function renderReviewCard(application: AdoptionEntranceApplication) {
    const open = openId === application.id;
    const pending = application.status === "pending";
    return (
      <Card key={application.id}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">{application.cat_name}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted {new Date(application.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusClass(application.status)}>
              {entranceReviewStatusLabel(application.status)}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOpenId(open ? null : application.id)}
            >
              {open ? "Hide" : "Review"}
            </Button>
          </div>
        </CardHeader>
        {open && (
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {ENTRANCE_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`rounded-full border px-2 py-1 text-xs ${
                    sectionId === section.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-transparent bg-muted text-muted-foreground"
                  }`}
                  onClick={() => setSectionId(section.id)}
                >
                  {section.title}
                </button>
              ))}
            </div>
            {ENTRANCE_SECTIONS.filter((section) => section.id === sectionId).map((section) => {
              const answers = answersFor(application);
              return (
                <section key={section.id} className="space-y-4">
                  <div className="space-y-4">
                    {entranceFieldGroups(section.fields, answers, { staffEditor: true }).map((group) => (
                      <div
                        key={group.heading || group.fields[0]?.key}
                        className={entranceFieldGroupClass(group.heading)}
                      >
                        {group.heading ? <h3 className="text-base font-semibold">{group.heading}</h3> : null}
                        <div className="grid gap-4 sm:grid-cols-2">
                          {group.fields.map((field) => (
                            <div
                              key={field.key}
                              className={entranceFieldSpansRow(field) ? "space-y-2 sm:col-span-2" : "space-y-2"}
                            >
                              <Label htmlFor={`entrance-${application.id}-${field.key}`}>
                                {entranceFieldLabel(field, answers)}
                                {field.key === "pet_store_name" ||
                                field.key === "pet_store_other_name" ||
                                field.key === "fff_volunteer_name"
                                  ? " *"
                                  : ""}
                                {field.staff && !field.submittedStamp ? (
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    Portal only
                                  </span>
                                ) : null}
                              </Label>
                              {field.submittedStamp ? (
                                <p className="text-sm">
                                  {new Date(application.created_at).toLocaleString(undefined, {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </p>
                              ) : (
                                <FieldControl
                                  field={{ ...field, key: `${application.id}-${field.key}` }}
                                  value={answers[field.key] ?? ""}
                                  invalid={false}
                                  onChange={(value) =>
                                    updateAnswer(application.id, answers, field.key, value)
                                  }
                                  onAddressSelect={(parts) =>
                                    updateAddress(application.id, answers, field.key, parts)
                                  }
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={busyId === application.id}
                onClick={() => void saveAnswers(application)}
              >
                {busyId === application.id ? "Saving..." : "Save changes"}
              </Button>
              {savedId === application.id && (
                <p className="text-sm text-muted-foreground">Saved</p>
              )}
            </div>
            {application.denial_reason && (
              <p className="text-sm">
                <span className="font-medium">Why declined: </span>
                {application.denial_reason}
              </p>
            )}
            {pending && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor={`deny-${application.id}`}>Reason for declining</Label>
                  <Textarea
                    id={`deny-${application.id}`}
                    value={reasons[application.id] ?? ""}
                    rows={3}
                    placeholder="Required only if you decline this cat."
                    aria-invalid={denialInvalidId === application.id}
                    className={
                      denialInvalidId === application.id
                        ? "border-destructive focus-visible:ring-destructive"
                        : undefined
                    }
                    onChange={(event) => {
                      setDenialInvalidId((current) =>
                        current === application.id ? null : current
                      );
                      setReasons((current) => ({
                        ...current,
                        [application.id]: event.target.value,
                      }));
                    }}
                  />
                  {denialInvalidId === application.id && (
                    <p className="text-sm text-destructive">
                      Enter why this cat was declined so the decision is clear.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busyId === application.id}
                    onClick={() => void decide(application, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busyId === application.id}
                    onClick={() => void decide(application, "denied")}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {applications.length} application{applications.length === 1 ? "" : "s"}
        </p>
        <CardsTableToggle value={viewMode} onChange={setViewMode} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {viewMode === "cards" ? (
        applications.map((application) => renderReviewCard(application))
      ) : (
        <div className="space-y-4">
          <DataTable
            tableId="rescue-applications"
            columns={columns}
            rows={applications}
            getRowKey={(row) => row.id}
            getRowClassName={(row) => (openId === row.id ? "bg-primary/5" : undefined)}
            emptyMessage="No rescue applications waiting for review."
          />
          {openApplication ? (
            renderReviewCard(openApplication)
          ) : (
            <p className="text-sm text-muted-foreground">Open a row to review the rescue application.</p>
          )}
        </div>
      )}
    </div>
  );
}
