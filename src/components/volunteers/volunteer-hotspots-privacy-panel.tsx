"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Profile } from "@/lib/types";

interface VolunteerHotspotsPrivacyPanelProps {
  profile: Profile;
}

export function VolunteerHotspotsPrivacyPanel({ profile }: VolunteerHotspotsPrivacyPanelProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(profile.show_on_hotspots_map !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(checked: boolean) {
    const previous = visible;
    setVisible(checked);
    setError(null);
    setSaving(true);

    const response = await fetch("/api/profile/hotspots-visibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showOnHotspotsMap: checked }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setVisible(previous);
      setError(result?.error ?? "Unable to update map visibility");
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hotspots map</CardTitle>
        <CardDescription>
          Control whether other team members can see your home area on the hotspots map when looking
          for nearby volunteers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-1">
            <Label htmlFor="hotspots-map-visible" className="text-base">
              Show me on the map
            </Label>
            <p className="text-sm text-muted-foreground">
              Your name and general location are shared with the team. Your full street address is
              not shown on the map.
            </p>
          </div>
          <Switch
            id="hotspots-map-visible"
            checked={visible}
            onCheckedChange={handleChange}
            disabled={saving}
            aria-label="Show me on the hotspots map"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
