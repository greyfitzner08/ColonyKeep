"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlatformBranding } from "@/lib/branding";
import { createClient } from "@/lib/supabase/client";

interface BrandingSettingsProps {
  branding: PlatformBranding;
}

export function BrandingSettings({ branding }: BrandingSettingsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [appName, setAppName] = useState(branding.app_name);
  const [logoUrl, setLogoUrl] = useState<string | null>(branding.logo_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  async function saveBranding(next: { app_name: string; logo_url: string | null }) {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    const response = await fetch("/api/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to save branding");
      return false;
    }

    const saved = result?.branding as PlatformBranding | undefined;
    if (saved) {
      setAppName(saved.app_name);
      setLogoUrl(saved.logo_url);
    }
    setSavedMessage("Branding saved. Refresh public pages to see the update everywhere.");
    router.refresh();
    return true;
  }

  async function handleSave() {
    await saveBranding({ app_name: appName, logo_url: logoUrl });
  }

  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file (PNG, JPG, SVG, or WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be 2 MB or smaller.");
      return;
    }

    setUploading(true);
    setError(null);
    setSavedMessage(null);

    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("branding").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      const nextLogoUrl = data.publicUrl;
      setLogoUrl(nextLogoUrl);
      const ok = await saveBranding({ app_name: appName.trim() || branding.app_name, logo_url: nextLogoUrl });
      if (!ok) {
        setError("Logo uploaded, but saving the URL failed. Try Save again.");
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    setLogoUrl(null);
    await saveBranding({ app_name: appName, logo_url: null });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card>
        <CardHeader>
          <CardTitle>App branding</CardTitle>
          <CardDescription>
            Set the name and logo shown in the sidebar, login, signup, and public forms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branding-app-name">App name</Label>
            <Input
              id="branding-app-name"
              value={appName}
              onChange={(event) => setAppName(event.target.value)}
              maxLength={80}
              placeholder="TNVR Rescue"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo / icon</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleLogoUpload(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading || saving}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={uploading || saving}
                  onClick={() => void handleRemoveLogo()}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove logo
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Square PNG or SVG works best. Without a logo, the default cat icon is used.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {savedMessage && <p className="text-sm text-muted-foreground">{savedMessage}</p>}

          <Button type="button" disabled={saving || uploading || !appName.trim()} onClick={() => void handleSave()}>
            {saving ? "Saving…" : "Save branding"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-sidebar p-4 text-sidebar-foreground">
            <BrandMark
              appName={appName.trim() || branding.app_name}
              logoUrl={logoUrl}
              nameClassName="text-sidebar-foreground"
              subtitle="Colony Management"
              subtitleClassName="text-sidebar-foreground/60"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Preview updates as you edit. Save to apply site-wide.
            </p>
          </div>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Current logo" className="h-16 w-16 rounded-md border object-contain p-1" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
