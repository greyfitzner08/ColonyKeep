"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import { brandingStyleProps } from "@/components/branding/branding-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SIDEBAR_COLOR,
  isValidHexColor,
  normalizeHexColor,
  type PlatformBranding,
} from "@/lib/branding";
import { createClient } from "@/lib/supabase/client";

interface BrandingSettingsProps {
  branding: PlatformBranding;
}

type BrandingPayload = {
  app_name: string;
  logo_url: string | null;
  logo_light_url: string | null;
  primary_color: string;
  sidebar_color: string;
};

type LogoSlot = "dark" | "light";

function ColorField({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const hexValue = isValidHexColor(value) ? normalizeHexColor(value, value) : value;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          id={`${id}-swatch`}
          type="color"
          value={isValidHexColor(hexValue) ? hexValue : "#000000"}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-12 cursor-pointer rounded border bg-transparent p-1"
          aria-label={`${label} color picker`}
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#21966B"
          className="font-mono uppercase"
          maxLength={7}
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function BrandingSettings({ branding }: BrandingSettingsProps) {
  const router = useRouter();
  const darkLogoInputRef = useRef<HTMLInputElement>(null);
  const lightLogoInputRef = useRef<HTMLInputElement>(null);
  const [appName, setAppName] = useState(branding.app_name);
  const [logoUrl, setLogoUrl] = useState<string | null>(branding.logo_url);
  const [logoLightUrl, setLogoLightUrl] = useState<string | null>(branding.logo_light_url);
  const [primaryColor, setPrimaryColor] = useState(branding.primary_color);
  const [sidebarColor, setSidebarColor] = useState(branding.sidebar_color);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<LogoSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const draftPrimary = isValidHexColor(primaryColor)
    ? normalizeHexColor(primaryColor, DEFAULT_PRIMARY_COLOR)
    : branding.primary_color;
  const draftSidebar = isValidHexColor(sidebarColor)
    ? normalizeHexColor(sidebarColor, DEFAULT_SIDEBAR_COLOR)
    : branding.sidebar_color;
  const previewStyle = brandingStyleProps({
    primary_color: draftPrimary,
    sidebar_color: draftSidebar,
  });

  async function saveBranding(next: BrandingPayload) {
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
      setLogoLightUrl(saved.logo_light_url);
      setPrimaryColor(saved.primary_color);
      setSidebarColor(saved.sidebar_color);
    }
    setSavedMessage("Branding saved. Theme colors apply across the app after refresh.");
    router.refresh();
    return true;
  }

  function currentPayload(overrides: Partial<BrandingPayload> = {}): BrandingPayload | null {
    if (!appName.trim()) return null;
    if (!isValidHexColor(primaryColor) || !isValidHexColor(sidebarColor)) return null;
    return {
      app_name: appName.trim(),
      logo_url: logoUrl,
      logo_light_url: logoLightUrl,
      primary_color: normalizeHexColor(primaryColor, DEFAULT_PRIMARY_COLOR),
      sidebar_color: normalizeHexColor(sidebarColor, DEFAULT_SIDEBAR_COLOR),
      ...overrides,
    };
  }

  async function handleSave() {
    if (!isValidHexColor(primaryColor) || !isValidHexColor(sidebarColor)) {
      setError("Theme colors must be hex values like #21966B.");
      return;
    }
    const payload = currentPayload();
    if (!payload) {
      setError("Enter an app name and valid theme colors.");
      return;
    }
    await saveBranding(payload);
  }

  async function handleLogoUpload(slot: LogoSlot, file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file (PNG, JPG, SVG, or WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be 2 MB or smaller.");
      return;
    }

    setUploadingSlot(slot);
    setError(null);
    setSavedMessage(null);

    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo-${slot}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("branding").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      const nextLogoUrl = data.publicUrl;
      if (slot === "dark") setLogoUrl(nextLogoUrl);
      else setLogoLightUrl(nextLogoUrl);

      const payload = currentPayload({
        app_name: appName.trim() || branding.app_name,
        ...(slot === "dark" ? { logo_url: nextLogoUrl } : { logo_light_url: nextLogoUrl }),
      });
      if (!payload) {
        setError("Logo uploaded, but theme colors are invalid. Fix colors and save.");
        return;
      }
      const ok = await saveBranding(payload);
      if (!ok) {
        setError("Logo uploaded, but saving failed. Try Save again.");
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload logo");
    } finally {
      setUploadingSlot(null);
      if (slot === "dark" && darkLogoInputRef.current) darkLogoInputRef.current.value = "";
      if (slot === "light" && lightLogoInputRef.current) lightLogoInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo(slot: LogoSlot) {
    if (slot === "dark") setLogoUrl(null);
    else setLogoLightUrl(null);
    const payload = currentPayload(
      slot === "dark" ? { logo_url: null } : { logo_light_url: null }
    );
    if (!payload) {
      setError("Fix theme colors before saving.");
      return;
    }
    await saveBranding(payload);
  }

  function resetThemeColors() {
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    setSidebarColor(DEFAULT_SIDEBAR_COLOR);
  }

  const busy = saving || uploadingSlot != null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card>
        <CardHeader>
          <CardTitle>App branding</CardTitle>
          <CardDescription>
            Set the name, logos for light and dark surfaces, and theme colors used across the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Logos</p>
              <p className="text-xs text-muted-foreground">
                Use a light logo for the dark sidebar, and a dark logo for login and other light
                pages. Square PNG or SVG works best.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Logo on dark backgrounds</Label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={darkLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleLogoUpload("dark", file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => darkLogoInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                  {uploadingSlot === "dark"
                    ? "Uploading…"
                    : logoUrl
                      ? "Replace dark logo"
                      : "Upload dark logo"}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void handleRemoveLogo("dark")}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Shown in the sidebar (typically a light/white mark).</p>
            </div>

            <div className="space-y-2">
              <Label>Logo on light backgrounds</Label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={lightLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleLogoUpload("light", file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => lightLogoInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                  {uploadingSlot === "light"
                    ? "Uploading…"
                    : logoLightUrl
                      ? "Replace light logo"
                      : "Upload light logo"}
                </Button>
                {logoLightUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void handleRemoveLogo("light")}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Shown on login and public pages (typically a dark/color mark). If missing, the dark
                logo is shown on a dark plate so it stays visible.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Theme colors</p>
                <p className="text-xs text-muted-foreground">
                  Primary drives buttons and links. Sidebar sets the navigation background.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={resetThemeColors}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset defaults
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                id="branding-primary"
                label="Primary"
                description="Buttons, links, and focus rings"
                value={primaryColor}
                onChange={setPrimaryColor}
              />
              <ColorField
                id="branding-sidebar"
                label="Sidebar"
                description="Main navigation background"
                value={sidebarColor}
                onChange={setSidebarColor}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {savedMessage && <p className="text-sm text-muted-foreground">{savedMessage}</p>}

          <Button
            type="button"
            disabled={
              busy ||
              !appName.trim() ||
              !isValidHexColor(primaryColor) ||
              !isValidHexColor(sidebarColor)
            }
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save branding"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="rounded-lg border bg-sidebar p-4 text-sidebar-foreground"
            style={previewStyle}
          >
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/60">
              Dark surface
            </p>
            <BrandMark
              surface="dark"
              appName={appName.trim() || branding.app_name}
              logoUrl={logoUrl}
              logoLightUrl={logoLightUrl}
              nameClassName="text-sidebar-foreground"
              subtitle="Colony Management"
              subtitleClassName="text-sidebar-foreground/60"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" type="button">
                Primary button
              </Button>
              <Button size="sm" type="button" variant="secondary">
                Secondary
              </Button>
            </div>
          </div>
          <div className="rounded-lg border bg-background p-4" style={previewStyle}>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Light surface
            </p>
            <BrandMark
              surface="light"
              appName={appName.trim() || branding.app_name}
              logoUrl={logoUrl}
              logoLightUrl={logoLightUrl}
              nameClassName="text-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Preview updates as you edit. Save to apply site-wide.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
