"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { IntakeAboutEditor } from "@/components/admin/intake-about-editor";
import { AboutUsStep } from "@/components/intake/about-us-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_ENTRANCE_ABOUT_MESSAGE,
  type RescueAboutLink,
} from "@/lib/branding";

export function RescueAboutEditor({
  initialMessage,
  initialButtonText,
  initialButtonUrl,
  initialLinks,
}: {
  initialMessage: string;
  initialButtonText: string;
  initialButtonUrl: string | null;
  initialLinks: RescueAboutLink[];
}) {
  const [message, setMessage] = useState(initialMessage);
  const [buttonText, setButtonText] = useState(initialButtonText);
  const [buttonUrl, setButtonUrl] = useState(initialButtonUrl ?? "");
  const [links, setLinks] = useState<RescueAboutLink[]>(
    initialLinks.length > 0 ? initialLinks : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateLink(index: number, patch: Partial<RescueAboutLink>) {
    setSaved(false);
    setLinks((current) => current.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/adoption/entrance/about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          buttonText,
          buttonUrl: buttonUrl.trim() || null,
          links,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to save the about us text.");
        return;
      }
      if (typeof result?.message === "string") setMessage(result.message);
      if (typeof result?.buttonText === "string") setButtonText(result.buttonText);
      setButtonUrl(typeof result?.buttonUrl === "string" ? result.buttonUrl : "");
      if (Array.isArray(result?.links)) setLinks(result.links);
      setSaved(true);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">About us</h2>
        <p className="text-sm text-muted-foreground">
          The first screen of the public rescue application. Style the message, add links in the
          text, list extra links, and set one button.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rescue-about-us">Message</Label>
        <IntakeAboutEditor
          id="rescue-about-us"
          allowLinks
          value={message}
          disabled={saving}
          onChange={(value) => {
            setMessage(value);
            setSaved(false);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            setMessage(DEFAULT_ENTRANCE_ABOUT_MESSAGE);
            setSaved(false);
          }}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset text
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Button</p>
          <p className="text-xs text-muted-foreground">Shown under the message on the public form.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rescue-about-button-text">Button label</Label>
            <Input
              id="rescue-about-button-text"
              value={buttonText}
              maxLength={80}
              disabled={saving}
              placeholder="Donate"
              onChange={(event) => {
                setButtonText(event.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rescue-about-button-url">Button link</Label>
            <Input
              id="rescue-about-button-url"
              value={buttonUrl}
              disabled={saving}
              placeholder="https://"
              className="font-mono text-sm"
              onChange={(event) => {
                setButtonUrl(event.target.value);
                setSaved(false);
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Links</p>
            <p className="text-xs text-muted-foreground">A short list of links under the message.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving || links.length >= 8}
            onClick={() => {
              setLinks((current) => [...current, { label: "", url: "" }]);
              setSaved(false);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add link
          </Button>
        </div>
        {links.length === 0 && (
          <p className="text-sm text-muted-foreground">No extra links yet.</p>
        )}
        {links.map((link, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
            <Input
              aria-label={`Link ${index + 1} label`}
              value={link.label}
              disabled={saving}
              placeholder="Label"
              onChange={(event) => updateLink(index, { label: event.target.value })}
            />
            <Input
              aria-label={`Link ${index + 1} address`}
              value={link.url}
              disabled={saving}
              placeholder="https://"
              className="font-mono text-sm"
              onChange={(event) => updateLink(index, { url: event.target.value })}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={saving}
              aria-label={`Remove link ${index + 1}`}
              onClick={() => {
                setLinks((current) => current.filter((_, i) => i !== index));
                setSaved(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving..." : "Save about us"}
        </Button>
        {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preview
        </p>
        <AboutUsStep
          message={message}
          donateUrl={buttonUrl.trim() || null}
          donateText={buttonText}
          links={links.filter((link) => link.label.trim() && link.url.trim())}
          allowLinks
          description="A few things to know before you submit a cat."
        />
      </div>
    </div>
  );
}
