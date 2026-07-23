"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import { CountySelect } from "@/components/forms/county-select";
import { resolveCountyFromAutocomplete } from "@/lib/counties";
import type { HelpRequest } from "@/lib/types";

interface CaseFeederFieldsProps {
  helpRequest: HelpRequest;
  onChange: (next: HelpRequest) => void;
  idPrefix?: string;
}

export function CaseFeederFields({
  helpRequest: hr,
  onChange,
  idPrefix = "feeder",
}: CaseFeederFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={hr.feeder_name ?? ""}
          onChange={(e) => onChange({ ...hr, feeder_name: e.target.value || null })}
          placeholder="Feeder full name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
        <Input
          id={`${idPrefix}-phone`}
          type="tel"
          value={hr.feeder_phone ?? ""}
          onChange={(e) => onChange({ ...hr, feeder_phone: e.target.value || null })}
          placeholder="(555) 555-5555"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={hr.feeder_email ?? ""}
          onChange={(e) => onChange({ ...hr, feeder_email: e.target.value || null })}
          placeholder="feeder@example.com"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <AddressAutocomplete
          id={`${idPrefix}-street`}
          label="Street address"
          defaultValue={hr.feeder_street ?? ""}
          onAddressChange={(address) => onChange({ ...hr, feeder_street: address || null })}
          onSelect={(parts) =>
            onChange({
              ...hr,
              feeder_street: parts.address || null,
              feeder_city: parts.city || null,
              feeder_state: parts.state || null,
              feeder_zip: parts.zip || null,
              feeder_county: resolveCountyFromAutocomplete(parts.county, parts.state) || null,
              feeder_lat: parts.lat ?? hr.feeder_lat,
              feeder_lng: parts.lng ?? hr.feeder_lng,
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-city`}>City</Label>
        <Input
          id={`${idPrefix}-city`}
          value={hr.feeder_city ?? ""}
          onChange={(e) => onChange({ ...hr, feeder_city: e.target.value || null })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-state`}>State</Label>
        <Input
          id={`${idPrefix}-state`}
          value={hr.feeder_state ?? ""}
          onChange={(e) => onChange({ ...hr, feeder_state: e.target.value || null })}
          placeholder="NC"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-zip`}>ZIP</Label>
        <Input
          id={`${idPrefix}-zip`}
          value={hr.feeder_zip ?? ""}
          onChange={(e) => onChange({ ...hr, feeder_zip: e.target.value || null })}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <CountySelect
          id={`${idPrefix}-county`}
          label="County"
          value={hr.feeder_county ?? ""}
          onChange={(value) => onChange({ ...hr, feeder_county: value || null })}
        />
      </div>
      {hr.feeder_if_not && !hr.feeder_name && (
        <div className="space-y-2 sm:col-span-2 rounded-md border bg-muted/40 p-3">
          <Label>Original intake note</Label>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{hr.feeder_if_not}</p>
        </div>
      )}
    </div>
  );
}
