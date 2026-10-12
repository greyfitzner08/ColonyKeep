"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import { IntakeAboutEditor, type IntakeAboutEditorHandle } from "@/components/admin/intake-about-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_INTAKE_ABOUT_MESSAGE, type PlatformBranding } from "@/lib/branding";
import {
  INTAKE_HELP_FUNNEL_FIELDS,
  createEmptyHelpFunnelRule,
  type IntakeHelpAnswerMatch,
  type IntakeHelpFunnelFieldKey,
  type IntakeHelpFunnelLink,
  type IntakeHelpFunnelRule,
} from "@/lib/intake/help-funnel";
import { cn } from "@/lib/utils";

function reindex(rules: IntakeHelpFunnelRule[]) {
  return rules.map((rule, index) => ({ ...rule, sort_order: index }));
}

function pathListTitle(rule: IntakeHelpFunnelRule) {
  return rule.title.trim() || rule.name.trim() || "Untitled path";
}

export function InquiryFormCustomFieldsEditor({ branding }: { branding: PlatformBranding }) {
  const router = useRouter();
  const editorRef = useRef<IntakeAboutEditorHandle>(null);
  const [message, setMessage] = useState(branding.intake_about_message);
  const [buttonText, setButtonText] = useState(branding.intake_donate_text);
  const [buttonUrl, setButtonUrl] = useState(branding.intake_donate_url ?? "");
  const [rules, setRules] = useState<IntakeHelpFunnelRule[]>(branding.intake_help_funnel_rules);
  /** Paths start collapsed; newly added ones open expanded. */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function markDirty() {
    setSaved(false);
  }

  function updateRule(id: string, patch: Partial<IntakeHelpFunnelRule>) {
    setRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
    );
    markDirty();
  }

  function updateCondition(
    id: string,
    field: IntakeHelpFunnelFieldKey,
    value: IntakeHelpAnswerMatch
  ) {
    setRules((current) =>
      current.map((rule) => {
        if (rule.id !== id) return rule;
        const conditions = { ...rule.conditions };
        if (value === "any") {
          delete conditions[field];
        } else {
          conditions[field] = value;
        }
        return { ...rule, conditions };
      })
    );
    markDirty();
  }

  function updateLink(ruleId: string, index: number, patch: Partial<IntakeHelpFunnelLink>) {
    setRules((current) =>
      current.map((rule) => {
        if (rule.id !== ruleId) return rule;
        const links = rule.links.map((link, i) => (i === index ? { ...link, ...patch } : link));
        return { ...rule, links };
      })
    );
    markDirty();
  }

  function moveRule(id: string, direction: -1 | 1) {
    setRules((current) => {
      const index = current.findIndex((rule) => rule.id === id);
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
    const html = editorRef.current?.getHtml() ?? message;
    setMessage(html);
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "intake",
          intake_about_message: html,
          intake_donate_text: buttonText,
          intake_donate_url: buttonUrl.trim() || null,
          intake_help_funnel_rules: reindex(rules),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to save inquiry form settings.");
        return;
      }
      const savedBranding = result?.branding as PlatformBranding | undefined;
      if (savedBranding) {
        setMessage(savedBranding.intake_about_message);
        setButtonText(savedBranding.intake_donate_text);
        setButtonUrl(savedBranding.intake_donate_url ?? "");
        setRules(savedBranding.intake_help_funnel_rules);
      }
      if (typeof result?.warning === "string" && result.warning) {
        setError(result.warning);
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-10">
      <div>
        <h2 className="text-lg font-semibold">Inquiry form custom fields</h2>
        <p className="text-sm text-muted-foreground">
          Customize the public report-a-colony form intro and the resources people see after they
          submit, based on their How you can help answers.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">About us intro</h3>
          <p className="text-sm text-muted-foreground">The first step of the public inquiry form.</p>
        </div>
        <IntakeAboutEditor
          ref={editorRef}
          id="inquiry-form-intro"
          variant="document"
          allowLinks
          allowLists
          value={message}
          disabled={saving}
          onChange={(value) => {
            setMessage(value);
            markDirty();
          }}
          preview={
            buttonText.trim() || buttonUrl.trim() ? (
              <div className="flex flex-wrap items-center gap-3 border-t px-6 py-4">
                <span className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                  {buttonText.trim() || "Donate"}
                </span>
                <p className="text-xs text-muted-foreground">Shown at the bottom of About us.</p>
              </div>
            ) : null
          }
        />

        <div className="max-w-xl space-y-3">
          <div>
            <h4 className="text-sm font-medium">Add a button</h4>
            <p className="text-xs text-muted-foreground">
              Shown at the bottom of About us. Leave both fields blank to hide it.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inquiry-intro-button-text">Button label</Label>
              <Input
                id="inquiry-intro-button-text"
                value={buttonText}
                maxLength={80}
                disabled={saving}
                placeholder="Donate"
                onChange={(event) => {
                  setButtonText(event.target.value);
                  markDirty();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inquiry-intro-button-url">Web address</Label>
              <Input
                id="inquiry-intro-button-url"
                value={buttonUrl}
                disabled={saving}
                placeholder="example.com"
                onChange={(event) => {
                  setButtonUrl(event.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t pt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">After-submit resources</h3>
            <p className="text-sm text-muted-foreground">
              Rules are checked top to bottom. The first match is shown on the thank-you screen.
              Mark one rule as fallback for everyone else.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving || rules.length >= 20}
            onClick={() => {
              const next = createEmptyHelpFunnelRule({
                name: `Resource path ${rules.length + 1}`,
                sort_order: rules.length,
              });
              setRules((current) => reindex([...current, next]));
              setExpandedIds((current) => new Set(current).add(next.id));
              markDirty();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add path
          </Button>
        </div>

        {rules.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No resource paths yet. Add one for helpers who can trap themselves, another for people
            who only need a trap, and optionally a fallback for everyone else.
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => {
              const expanded = expandedIds.has(rule.id);
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "rounded-lg border bg-card shadow-sm",
                    expanded ? "space-y-4 p-4" : "px-3 py-2.5"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      aria-expanded={expanded}
                      onClick={() => toggleExpanded(rule.id)}
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate text-sm font-medium">{pathListTitle(rule)}</span>
                      {!rule.enabled ? (
                        <Badge variant="outline" className="shrink-0 text-[11px]">
                          Disabled
                        </Badge>
                      ) : null}
                      {rule.is_fallback ? (
                        <Badge variant="secondary" className="shrink-0 text-[11px]">
                          Fallback
                        </Badge>
                      ) : null}
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={saving || index === 0}
                        aria-label="Move up"
                        onClick={() => moveRule(rule.id, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={saving || index === rules.length - 1}
                        aria-label="Move down"
                        onClick={() => moveRule(rule.id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={saving}
                        aria-label="Remove path"
                        onClick={() => {
                          setRules((current) =>
                            reindex(current.filter((entry) => entry.id !== rule.id))
                          );
                          setExpandedIds((current) => {
                            const next = new Set(current);
                            next.delete(rule.id);
                            return next;
                          });
                          markDirty();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expanded ? (
                    <>
                      <div className="min-w-0 space-y-1.5">
                        <Label htmlFor={`funnel-name-${rule.id}`}>Admin label</Label>
                        <Input
                          id={`funnel-name-${rule.id}`}
                          value={rule.name}
                          disabled={saving}
                          maxLength={80}
                          onChange={(event) => updateRule(rule.id, { name: event.target.value })}
                        />
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={rule.enabled}
                            disabled={saving}
                            onCheckedChange={(checked) =>
                              updateRule(rule.id, { enabled: checked === true })
                            }
                          />
                          Enabled
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={rule.is_fallback}
                            disabled={saving}
                            onCheckedChange={(checked) =>
                              updateRule(rule.id, { is_fallback: checked === true })
                            }
                          />
                          Fallback (use when nothing else matches)
                        </label>
                      </div>

                      {!rule.is_fallback ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            Match when How you can help answers are…
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {INTAKE_HELP_FUNNEL_FIELDS.map((field) => (
                              <div key={field.key} className="space-y-1.5">
                                <Label htmlFor={`funnel-${rule.id}-${field.key}`}>
                                  {field.label}
                                </Label>
                                <Select
                                  value={rule.conditions[field.key] ?? "any"}
                                  onValueChange={(value) =>
                                    updateCondition(
                                      rule.id,
                                      field.key,
                                      value as IntakeHelpAnswerMatch
                                    )
                                  }
                                  disabled={saving}
                                >
                                  <SelectTrigger id={`funnel-${rule.id}-${field.key}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Any</SelectItem>
                                    <SelectItem value="Yes">Yes</SelectItem>
                                    <SelectItem value="No">No</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-1.5">
                        <Label htmlFor={`funnel-title-${rule.id}`}>Title shown to submitter</Label>
                        <Input
                          id={`funnel-title-${rule.id}`}
                          value={rule.title}
                          disabled={saving}
                          maxLength={120}
                          placeholder="Next steps for trapping yourself"
                          onChange={(event) =>
                            updateRule(rule.id, { title: event.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <div>
                          <Label htmlFor={`funnel-body-${rule.id}`}>Message</Label>
                          <p className="text-xs text-muted-foreground">
                            Format text and insert links the same way as the About us editors.
                          </p>
                        </div>
                        <IntakeAboutEditor
                          id={`funnel-body-${rule.id}`}
                          variant="document"
                          allowLinks
                          allowLists
                          value={rule.body}
                          disabled={saving}
                          onChange={(value) => updateRule(rule.id, { body: value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <Label>Button links</Label>
                            <p className="text-xs text-muted-foreground">
                              Optional large buttons under the message (e.g. Watch TNVR video).
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={saving || rule.links.length >= 6}
                            onClick={() =>
                              updateRule(rule.id, {
                                links: [...rule.links, { label: "", url: "" }],
                              })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add button
                          </Button>
                        </div>
                        {rule.links.length === 0 ? null : (
                          <div className="space-y-2">
                            {rule.links.map((link, linkIndex) => (
                              <div
                                key={`${rule.id}-link-${linkIndex}`}
                                className="flex flex-wrap gap-2"
                              >
                                <Input
                                  className="min-w-[10rem] flex-1"
                                  value={link.label}
                                  disabled={saving}
                                  placeholder="Button label"
                                  maxLength={80}
                                  onChange={(event) =>
                                    updateLink(rule.id, linkIndex, {
                                      label: event.target.value,
                                    })
                                  }
                                />
                                <Input
                                  className="min-w-[12rem] flex-[2]"
                                  value={link.url}
                                  disabled={saving}
                                  placeholder="https://…"
                                  onChange={(event) =>
                                    updateLink(rule.id, linkIndex, { url: event.target.value })
                                  }
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={saving}
                                  aria-label="Remove button"
                                  onClick={() =>
                                    updateRule(rule.id, {
                                      links: rule.links.filter((_, i) => i !== linkIndex),
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            editorRef.current?.setHtml(DEFAULT_INTAKE_ABOUT_MESSAGE);
            markDirty();
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset intro text
        </Button>
        <div className="flex items-center gap-3">
          {saved && !error && <p className="text-sm text-muted-foreground">Saved</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
