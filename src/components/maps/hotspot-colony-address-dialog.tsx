"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSingleLineAddress } from "@/lib/cases/colony-notes";
import { resolveCountyFromAutocomplete } from "@/lib/counties";
import type { HelpRequest } from "@/lib/types";

interface HotspotColonyAddressDialogProps {
  helpRequest: HelpRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: HelpRequest, geocoded: boolean) => void;
}

interface ColonyFormState {
  colony_address: string;
  colony_city: string;
  colony_state: string;
  colony_zip: string;
  colony_county: string;
  colony_lat: number | null;
  colony_lng: number | null;
}

function formFromHelpRequest(hr: HelpRequest): ColonyFormState {
  return {
    colony_address: hr.colony_address ?? "",
    colony_city: hr.colony_city ?? "",
    colony_state: hr.colony_state ?? "",
    colony_zip: hr.colony_zip ?? "",
    colony_county: hr.colony_county ?? "",
    colony_lat: hr.colony_lat,
    colony_lng: hr.colony_lng,
  };
}

export function HotspotColonyAddressDialog({
  helpRequest,
  open,
  onOpenChange,
  onSaved,
}: HotspotColonyAddressDialogProps) {
  const [form, setForm] = useState<ColonyFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (helpRequest && open) {
      setForm(formFromHelpRequest(helpRequest));
      setError(null);
    }
  }, [helpRequest, open]);

  if (!helpRequest || !form) {
    return null;
  }

  function update<K extends keyof ColonyFormState>(key: K, value: ColonyFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave() {
    if (!form || !helpRequest) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/help-requests/colony-address", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          help_request_id: helpRequest.id,
          ...form,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save colony address");
      }

      onSaved(payload.helpRequest as HelpRequest, Boolean(payload.geocoded));
      if (payload.geocoded) {
        onOpenChange(false);
      } else {
        setForm(formFromHelpRequest(payload.helpRequest as HelpRequest));
        setError(
          "Address saved on the case, but it still could not be mapped. Try a more complete street address."
        );
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save colony address");
    } finally {
      setSaving(false);
    }
  }

  const currentAddress = formatSingleLineAddress([
    helpRequest.colony_address,
    helpRequest.colony_city,
    helpRequest.colony_state,
    helpRequest.colony_zip,
    helpRequest.colony_county,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit colony address</DialogTitle>
          <DialogDescription>
            Updates case {helpRequest.case_number} everywhere in the app, including intake and trap
            queues.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentAddress && (
            <p className="text-sm text-muted-foreground">
              Current: {currentAddress}
            </p>
          )}

          <AddressAutocomplete
            label="Colony address"
            defaultValue={form.colony_address}
            onAddressChange={(address) => update("colony_address", address)}
            onSelect={(parts) => {
              update("colony_address", parts.address);
              update("colony_city", parts.city);
              update("colony_state", parts.state);
              update("colony_county", resolveCountyFromAutocomplete(parts.county, parts.state));
              update("colony_zip", parts.zip);
              update("colony_lat", parts.lat ?? null);
              update("colony_lng", parts.lng ?? null);
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hotspot-colony-city">City</Label>
              <Input
                id="hotspot-colony-city"
                value={form.colony_city}
                onChange={(event) => update("colony_city", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotspot-colony-state">State</Label>
              <Input
                id="hotspot-colony-state"
                value={form.colony_state}
                onChange={(event) => update("colony_state", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hotspot-colony-zip">ZIP</Label>
              <Input
                id="hotspot-colony-zip"
                value={form.colony_zip}
                onChange={(event) => update("colony_zip", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotspot-colony-county">County</Label>
              <Input
                id="hotspot-colony-county"
                value={form.colony_county}
                onChange={(event) => update("colony_county", event.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save address"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            <Link href={`/case/${helpRequest.id}`} className="text-primary underline">
              Open full case
            </Link>{" "}
            for other edits.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
