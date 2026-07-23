"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import { CountySelect } from "@/components/forms/county-select";
import { resolveCountyFromAutocomplete } from "@/lib/counties";

export interface VolunteerContactFormValues {
  full_name: string;
  email: string;
  phone: string;
  birthday: string;
  home_street: string;
  home_city: string;
  home_state: string;
  home_zip: string;
  home_county: string;
}

interface VolunteerContactFieldsFormProps {
  values: VolunteerContactFormValues;
  onChange: (values: VolunteerContactFormValues) => void;
  emailReadOnly?: boolean;
  showBirthday?: boolean;
  idPrefix?: string;
}

export function VolunteerContactFieldsForm({
  values,
  onChange,
  emailReadOnly = false,
  showBirthday = false,
  idPrefix = "volunteer-contact",
}: VolunteerContactFieldsFormProps) {
  function update<K extends keyof VolunteerContactFormValues>(
    field: K,
    value: VolunteerContactFormValues[K]
  ) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-full-name`}>Full name</Label>
        <Input
          id={`${idPrefix}-full-name`}
          value={values.full_name}
          onChange={(event) => update("full_name", event.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-email`}>Email</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            disabled={emailReadOnly}
            className={emailReadOnly ? "bg-muted" : undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            value={values.phone}
            onChange={(event) => update("phone", event.target.value)}
            required
          />
        </div>
      </div>

      {showBirthday && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-birthday`}>Birthday</Label>
          <Input
            id={`${idPrefix}-birthday`}
            type="date"
            value={values.birthday}
            onChange={(event) => update("birthday", event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Month and day only are shown to others on the team feed.
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <p className="font-medium text-sm">Home address</p>
          <p className="text-xs text-muted-foreground mt-1">
            Used for team coordination. Update this if you move.
          </p>
        </div>

        <AddressAutocomplete
          label="Home street address"
          defaultValue={values.home_street}
          required
          onAddressChange={(address) => update("home_street", address)}
          onSelect={(parts) =>
            onChange({
              ...values,
              home_street: parts.address,
              home_city: parts.city,
              home_state: parts.state,
              home_county: resolveCountyFromAutocomplete(parts.county, parts.state),
              home_zip: parts.zip,
            })
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-home-city`}>City</Label>
            <Input
              id={`${idPrefix}-home-city`}
              value={values.home_city}
              onChange={(event) => update("home_city", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-home-state`}>State</Label>
            <Input
              id={`${idPrefix}-home-state`}
              value={values.home_state}
              onChange={(event) => update("home_state", event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-home-zip`}>ZIP code</Label>
            <Input
              id={`${idPrefix}-home-zip`}
              value={values.home_zip}
              onChange={(event) => update("home_zip", event.target.value)}
            />
          </div>
          <CountySelect
            id={`${idPrefix}-home-county`}
            value={values.home_county}
            onChange={(county) => update("home_county", county)}
          />
        </div>
      </div>
    </div>
  );
}

export function emptyVolunteerContactFormValues(): VolunteerContactFormValues {
  return {
    full_name: "",
    email: "",
    phone: "",
    birthday: "",
    home_street: "",
    home_city: "",
    home_state: "",
    home_zip: "",
    home_county: "",
  };
}
