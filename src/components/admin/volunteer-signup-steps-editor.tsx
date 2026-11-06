"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ExternalLink, Plus, Trash2 } from "lucide-react";
import { IntakeAboutEditor } from "@/components/admin/intake-about-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlatformBranding } from "@/lib/branding";
import type { RoleDescription, VolunteerRole } from "@/lib/types";
import {
  createEmptyVolunteerSignupStep,
  type VolunteerSignupStep,
  type VolunteerSignupStepLink,
} from "@/lib/volunteers/signup-steps";
import { cn } from "@/lib/utils";

function reindex(steps: VolunteerSignupStep[]) {
  return steps.map((step, index) => ({ ...step, sort_order: index }));
}

function stepListTitle(step: VolunteerSignupStep) {
  return step.title.trim() || step.name.trim() || "Untitled step";
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/15 p-3">
      <div className="space-y-0.5">
        <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function VolunteerSignupStepsEditor({
  branding,
  roles,
}: {
  branding: PlatformBranding;
  roles: RoleDescription[];
}) {
  const router = useRouter();
  const [steps, setSteps] = useState<VolunteerSignupStep[]>(branding.volunteer_signup_steps);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const signupRoles = roles.filter((role) => role.is_signup_active !== false);

  function markDirty() {
    setSaved(false);
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateStep(id: string, patch: Partial<VolunteerSignupStep>) {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)));
    markDirty();
  }

  function toggleRole(id: string, role: VolunteerRole) {
    setSteps((current) =>
      current.map((step) => {
        if (step.id !== id) return step;
        const rolesForStep = step.roles.includes(role)
          ? step.roles.filter((entry) => entry !== role)
          : [...step.roles, role];
        return { ...step, roles: rolesForStep };
      })
    );
    markDirty();
  }

  function updateLink(stepId: string, index: number, patch: Partial<VolunteerSignupStepLink>) {
    setSteps((current) =>
      current.map((step) => {
        if (step.id !== stepId) return step;
        const links = step.links.map((link, i) => (i === index ? { ...link, ...patch } : link));
        return { ...step, links };
      })
    );
    markDirty();
  }

  function moveStep(id: string, direction: -1 | 1) {
    setSteps((current) => {
      const index = current.findIndex((step) => step.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return reindex(next);
    });
    markDirty();
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "volunteer-signup",
          volunteer_signup_steps: reindex(steps),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to save volunteer application steps.");
        return;
      }
      const savedBranding = result?.branding as PlatformBranding | undefined;
      if (savedBranding) setSteps(savedBranding.volunteer_signup_steps);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold">Volunteer application steps</h2>
          <p className="text-sm text-muted-foreground">
            Extra steps shown while someone applies, after they choose volunteer opportunities.
            Leave opportunities blank to show a step to everyone. Otherwise it appears only when
            their interests match.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" asChild>
          <a href="/volunteer-signup" target="_blank" rel="noopener noreferrer">
            View application
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      <div className="space-y-3">
        {steps.length === 0 ? (
          <p className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
            No extra steps yet. Add one for trapping roles, another for recovery space, or a step
            everyone should read.
          </p>
        ) : (
          steps.map((step, index) => {
            const expanded = expandedIds.has(step.id);
            return (
              <div key={step.id} className="rounded-lg border bg-background">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-expanded={expanded}
                    onClick={() => toggleExpanded(step.id)}
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{stepListTitle(step)}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.roles.length === 0
                        ? "Everyone"
                        : `${step.role_match === "all" ? "All of" : "Any of"} ${step.roles.length} opportunit${
                            step.roles.length === 1 ? "y" : "ies"
                          }`}
                      {!step.enabled ? " · Hidden" : ""}
                    </p>
                  </div>
                  {!step.enabled ? <Badge variant="secondary">Off</Badge> : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={saving || index === 0}
                    onClick={() => moveStep(step.id, -1)}
                    aria-label="Move step up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={saving || index === steps.length - 1}
                    onClick={() => moveStep(step.id, 1)}
                    aria-label="Move step down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    disabled={saving}
                    onClick={() => {
                      setSteps((current) => reindex(current.filter((entry) => entry.id !== step.id)));
                      markDirty();
                    }}
                    aria-label="Delete step"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {expanded ? (
                  <div className="space-y-3 border-t px-3 py-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="space-y-1.5">
                        <Label htmlFor={`signup-step-name-${step.id}`}>Admin label</Label>
                        <Input
                          id={`signup-step-name-${step.id}`}
                          value={step.name}
                          disabled={saving}
                          maxLength={80}
                          onChange={(event) => updateStep(step.id, { name: event.target.value })}
                        />
                      </div>
                      <label className="flex items-center gap-2 pb-2 text-sm">
                        <Checkbox
                          checked={step.enabled}
                          disabled={saving}
                          onCheckedChange={(checked) =>
                            updateStep(step.id, { enabled: checked === true })
                          }
                        />
                        Enabled
                      </label>
                    </div>

                    <Section
                      title="Opportunities"
                      description="Shown after the applicant selects interests. No boxes checked means everyone sees this step."
                    >
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={step.role_match === "any" ? "secondary" : "outline"}
                          disabled={saving || step.roles.length === 0}
                          onClick={() => updateStep(step.id, { role_match: "any" })}
                        >
                          Any selected
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={step.role_match === "all" ? "secondary" : "outline"}
                          disabled={saving || step.roles.length === 0}
                          onClick={() => updateStep(step.id, { role_match: "all" })}
                        >
                          All selected
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {signupRoles.map((role) => (
                          <label
                            key={role.role_id}
                            className={cn(
                              "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                              step.roles.includes(role.role_id) && "border-primary/40 bg-primary/5"
                            )}
                          >
                            <Checkbox
                              checked={step.roles.includes(role.role_id)}
                              disabled={saving}
                              onCheckedChange={() => toggleRole(step.id, role.role_id)}
                            />
                            <span>{role.label}</span>
                          </label>
                        ))}
                      </div>
                    </Section>

                    <Section title="What the applicant sees">
                      <div className="space-y-1.5">
                        <Label htmlFor={`signup-step-title-${step.id}`}>Title</Label>
                        <Input
                          id={`signup-step-title-${step.id}`}
                          value={step.title}
                          disabled={saving}
                          maxLength={120}
                          placeholder="What trapping volunteers should know"
                          onChange={(event) => updateStep(step.id, { title: event.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`signup-step-body-${step.id}`}>Message</Label>
                        <IntakeAboutEditor
                          id={`signup-step-body-${step.id}`}
                          variant="document"
                          allowLinks
                          allowLists
                          value={step.body}
                          disabled={saving}
                          onChange={(value) => updateStep(step.id, { body: value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Label>Buttons</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={saving || step.links.length >= 6}
                            onClick={() =>
                              updateStep(step.id, {
                                links: [...step.links, { label: "", url: "" }],
                              })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                        {step.links.map((link, linkIndex) => (
                          <div key={`${step.id}-link-${linkIndex}`} className="flex flex-wrap gap-2">
                            <Input
                              className="min-w-[10rem] flex-1"
                              value={link.label}
                              disabled={saving}
                              placeholder="Button label"
                              maxLength={80}
                              onChange={(event) =>
                                updateLink(step.id, linkIndex, { label: event.target.value })
                              }
                            />
                            <Input
                              className="min-w-[12rem] flex-[2]"
                              value={link.url}
                              disabled={saving}
                              placeholder="https://"
                              onChange={(event) =>
                                updateLink(step.id, linkIndex, { url: event.target.value })
                              }
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={saving}
                              onClick={() =>
                                updateStep(step.id, {
                                  links: step.links.filter((_, i) => i !== linkIndex),
                                })
                              }
                              aria-label="Remove button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Section>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={saving || steps.length >= 20}
          onClick={() => {
            const created = createEmptyVolunteerSignupStep({ sort_order: steps.length });
            setSteps((current) => [...current, created]);
            setExpandedIds((current) => new Set(current).add(created.id));
            markDirty();
          }}
        >
          <Plus className="h-4 w-4" />
          Add step
        </Button>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save steps"}
        </Button>
        {saved ? <p className="text-sm text-primary">Saved</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
