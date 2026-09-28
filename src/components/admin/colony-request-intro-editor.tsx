"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { IntakeAboutEditor, type IntakeAboutEditorHandle } from "@/components/admin/intake-about-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_INTAKE_ABOUT_MESSAGE, type PlatformBranding } from "@/lib/branding";

export function ColonyRequestIntroEditor({ branding }: { branding: PlatformBranding }) {
  const router = useRouter();
  const editorRef = useRef<IntakeAboutEditorHandle>(null);
  const [message, setMessage] = useState(branding.intake_about_message);
  const [buttonText, setButtonText] = useState(branding.intake_donate_text);
  const [buttonUrl, setButtonUrl] = useState(branding.intake_donate_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to save the colony request intro.");
        return;
      }
      const savedBranding = result?.branding as PlatformBranding | undefined;
      if (savedBranding) {
        setMessage(savedBranding.intake_about_message);
        setButtonText(savedBranding.intake_donate_text);
        setButtonUrl(savedBranding.intake_donate_url ?? "");
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
    <div className="w-full space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Colony Request Intro</h2>
        <p className="text-sm text-muted-foreground">
          The first step of the public report-a-colony form.
        </p>
      </div>
      <IntakeAboutEditor
        ref={editorRef}
        id="colony-request-intro"
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
                {buttonText.trim() || "Donate"}
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
            Shown at the bottom of About us on the colony form. Leave both fields blank to hide it.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="colony-intro-button-text">Button label</Label>
            <Input
              id="colony-intro-button-text"
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
          <div className="space-y-1.5">
            <Label htmlFor="colony-intro-button-url">Web address</Label>
            <Input
              id="colony-intro-button-url"
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
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            editorRef.current?.setHtml(DEFAULT_INTAKE_ABOUT_MESSAGE);
            setSaved(false);
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset text
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
