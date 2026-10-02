"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { IntakeAboutEditor, type IntakeAboutEditorHandle } from "@/components/admin/intake-about-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_ENTRANCE_ABOUT_MESSAGE } from "@/lib/branding";

export function RescueAboutEditor({
  initialMessage,
  initialButtonText,
  initialButtonUrl,
}: {
  initialMessage: string;
  initialButtonText: string;
  initialButtonUrl: string | null;
}) {
  const router = useRouter();
  const editorRef = useRef<IntakeAboutEditorHandle>(null);
  const [message, setMessage] = useState(initialMessage);
  const [buttonText, setButtonText] = useState(initialButtonText);
  const [buttonUrl, setButtonUrl] = useState(initialButtonUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    const html = editorRef.current?.getHtml() ?? message;
    setMessage(html);
    setSaving(true);
    setError(null);
    setWarning(null);
    setSaved(false);
    try {
      const response = await fetch("/api/adoption/entrance/about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: html,
          buttonText,
          buttonUrl: buttonUrl.trim() || null,
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
      if (typeof result?.warning === "string" && result.warning) {
        setWarning(result.warning);
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
        preview={
          buttonText.trim() || buttonUrl.trim() ? (
            <div className="flex flex-wrap items-center gap-3 border-t px-6 py-4">
              <span className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                {buttonText.trim() || "Continue"}
              </span>
              <p className="text-xs text-muted-foreground">Shown at the bottom of About us.</p>
            </div>
          ) : null
        }
      />

      <section className="max-w-xl space-y-3">
        <div>
          <h2 className="text-sm font-medium">Add a button</h2>
          <p className="text-xs text-muted-foreground">
            Shown at the bottom of About us on the rescue form. Leave both fields blank to hide it.
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
          {warning && <p className="text-sm text-muted-foreground">{warning}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
