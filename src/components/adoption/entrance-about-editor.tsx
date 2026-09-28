"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { IntakeAboutEditor } from "@/components/admin/intake-about-editor";
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
  const [links, setLinks] = useState<RescueAboutLink[]>(initialLinks);
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
    <div className="mx-auto max-w-3xl space-y-8">
      <IntakeAboutEditor
        id="rescue-about-us"
        variant="document"
        allowLinks
        allowLists
        value={message}
        disabled={saving}
        onChange={(value) => {
          setMessage(value);
          setSaved(false);
        }}
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-medium">Button</h2>
            <p className="text-xs text-muted-foreground">Optional action under the text.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rescue-about-button-text" className="sr-only">
              Button label
            </Label>
            <Input
              id="rescue-about-button-text"
              value={buttonText}
              maxLength={80}
              disabled={saving}
              placeholder="Button label"
              onChange={(event) => {
                setButtonText(event.target.value);
                setSaved(false);
              }}
            />
            <Label htmlFor="rescue-about-button-url" className="sr-only">
              Button link
            </Label>
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

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Links</h2>
              <p className="text-xs text-muted-foreground">Shown as a short list under the text.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              disabled={saving || links.length >= 8}
              onClick={() => {
                setLinks((current) => [...current, { label: "", url: "" }]);
                setSaved(false);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          {links.length === 0 && (
            <p className="text-sm text-muted-foreground">No links yet.</p>
          )}
          <div className="space-y-2">
            {links.map((link, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="grid flex-1 gap-2">
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
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 px-0"
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
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
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
          <RotateCcw className="h-3.5 w-3.5" />
          Reset text
        </Button>
        <div className="flex items-center gap-3">
          {saved && <p className="text-sm text-muted-foreground">Saved</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
