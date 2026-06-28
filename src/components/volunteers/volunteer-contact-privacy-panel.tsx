"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { contactPrivacyFromProfile } from "@/lib/volunteers/contact-privacy";
import type { ContactPrivacySettings } from "@/lib/volunteers/contact-privacy";
import type { Profile } from "@/lib/types";

interface VolunteerContactPrivacyPanelProps {
  profile: Profile;
}

function PrivacyToggle({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-4">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-base">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

export function VolunteerContactPrivacyPanel({ profile }: VolunteerContactPrivacyPanelProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<ContactPrivacySettings>(() =>
    contactPrivacyFromProfile(profile)
  );
  const [savingField, setSavingField] = useState<keyof ContactPrivacySettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateSetting(field: keyof ContactPrivacySettings, checked: boolean) {
    const previous = settings;
    const next = { ...settings, [field]: checked };
    setSettings(next);
    setError(null);
    setSavingField(field);

    const body: Record<string, boolean> = {
      showOnHotspotsMap: next.show_on_hotspots_map,
      showPhoneInDirectory: next.show_phone_in_directory,
      showAddressInDirectory: next.show_address_in_directory,
      showPhoneOnHotspotsMap: next.show_phone_on_hotspots_map,
      showAddressOnHotspotsMap: next.show_address_on_hotspots_map,
    };

    const response = await fetch("/api/profile/contact-privacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    setSavingField(null);

    if (!response.ok) {
      setSettings(previous);
      setError(result?.error ?? "Unable to update privacy settings");
      return;
    }

    router.refresh();
  }

  const mapDisabled = !settings.show_on_hotspots_map;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Directory &amp; map visibility</CardTitle>
        <CardDescription>
          Choose what contact details other team members can see in the team directory and on the
          hotspots map.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Team directory</h3>
          <PrivacyToggle
            id="show-phone-directory"
            label="Show phone number"
            description="When off, your phone is hidden from the team directory. Email and name are always shown."
            checked={settings.show_phone_in_directory}
            disabled={savingField === "show_phone_in_directory"}
            onCheckedChange={(checked) => updateSetting("show_phone_in_directory", checked)}
          />
          <PrivacyToggle
            id="show-address-directory"
            label="Show home address"
            description="When off, your address is hidden from the team directory."
            checked={settings.show_address_in_directory}
            disabled={savingField === "show_address_in_directory"}
            onCheckedChange={(checked) => updateSetting("show_address_in_directory", checked)}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Hotspots map</h3>
          <PrivacyToggle
            id="hotspots-map-visible"
            label="Show me on the map"
            description="Places a marker near your home area so teammates can find nearby volunteers."
            checked={settings.show_on_hotspots_map}
            disabled={savingField === "show_on_hotspots_map"}
            onCheckedChange={(checked) => updateSetting("show_on_hotspots_map", checked)}
          />
          <PrivacyToggle
            id="show-phone-hotspots"
            label="Show phone on map pop-up"
            description="Adds your phone number to the marker pop-up when someone clicks your location."
            checked={settings.show_phone_on_hotspots_map}
            disabled={mapDisabled || savingField === "show_phone_on_hotspots_map"}
            onCheckedChange={(checked) => updateSetting("show_phone_on_hotspots_map", checked)}
          />
          <PrivacyToggle
            id="show-address-hotspots"
            label="Show address on map pop-up"
            description="Adds your home address to the marker pop-up when someone clicks your location."
            checked={settings.show_address_on_hotspots_map}
            disabled={mapDisabled || savingField === "show_address_on_hotspots_map"}
            onCheckedChange={(checked) => updateSetting("show_address_on_hotspots_map", checked)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
