"use client";

import { useRef, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { IntakeAboutEditor, type IntakeAboutEditorHandle } from "@/components/admin/intake-about-editor";
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
  const editorRef = useRef<IntakeAboutEditorHandle>(null);
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
    const html = editorRef.current?.getHtml() ?? message;
    setMessage(html);
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/adoption/entrance/about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: html,
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
      if (typeof result?.warning === "string" && result.warning) {
        setError(result.warning);
      }
      setSaved(true);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      <IntakeAboutEditor
        ref={editorRef}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border p-4">
          <div>
            <h2 className="text-sm font-medium">Add a button</h2>
            <p className="text-xs text-muted-foreground">
              Shown under the text on the rescue form. Leave both fields blank to show no button.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rescue-about-button-text">Button label</Label>
              <Input
                id="rescue-about-button-text"
                value={buttonText}
                maxLength={80}
                disabled={saving}
                placeholder="Learn more"
                onChange={(event) => {
                  setButtonText(event.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rescue-about-button-url">Web address</Label>
              <Input
                id="rescue-about-button-url"
                value={buttonUrl}
                disabled={saving}
                placeholder="example.com"
                onChange={(event) => {
                  setButtonUrl(event.target.value);
                  setSaved(false);
                }}
              />
            </div>
          </div>
          {buttonText.trim() && (
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                {buttonText.trim()}
              </span>
              {!buttonUrl.trim() && (
                <p className="text-xs text-muted-foreground">Add a web address so this button goes somewhere.</p>
              )}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Link list</h2>
              <p className="text-xs text-muted-foreground">
                Extra links under the text. For a word inside the paragraph, use Link in the toolbar.
              </p>
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
              <Plus className="h-3.5 w-3.5" />
              Add a link
            </Button>
          </div>
          {links.length === 0 && (
            <p className="text-sm text-muted-foreground">No extra links yet.</p>
          )}
          <div className="space-y-3">
            {links.map((link, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`rescue-link-label-${index}`}>Label</Label>
                    <Input
                      id={`rescue-link-label-${index}`}
                      value={link.label}
                      disabled={saving}
                      placeholder="Foster program"
                      onChange={(event) => updateLink(index, { label: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`rescue-link-url-${index}`}>Web address</Label>
                    <Input
                      id={`rescue-link-url-${index}`}
                      value={link.url}
                      disabled={saving}
                      placeholder="example.com"
                      onChange={(event) => updateLink(index, { url: event.target.value })}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 px-0"
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
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            editorRef.current?.setHtml(DEFAULT_ENTRANCE_ABOUT_MESSAGE);
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
