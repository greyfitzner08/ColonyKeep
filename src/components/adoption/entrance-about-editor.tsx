"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { IntakeAboutEditor } from "@/components/admin/intake-about-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_ENTRANCE_ABOUT_MESSAGE } from "@/lib/branding";

export function EntranceAboutEditor({ initialMessage }: { initialMessage: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/adoption/entrance/about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to save the about us text.");
        return;
      }
      if (typeof result?.message === "string") setMessage(result.message);
      setSaved(true);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">About us</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            The first screen people see on the public entrance form. Style the text with bold,
            italic, underline, and color.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide" : "Edit"}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <IntakeAboutEditor
            id="entrance-about-us"
            value={message}
            disabled={saving}
            onChange={(value) => {
              setMessage(value);
              setSaved(false);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving..." : "Save about us"}
            </Button>
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
            {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      )}
    </Card>
  );
}
