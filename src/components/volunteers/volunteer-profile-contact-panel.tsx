"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  VolunteerContactFieldsForm,
  emptyVolunteerContactFormValues,
  type VolunteerContactFormValues,
} from "@/components/volunteers/volunteer-contact-fields-form";
import { isHomeAddressComplete } from "@/lib/volunteers/contact-fields";
import type { Profile } from "@/lib/types";

interface VolunteerProfileContactPanelProps {
  profile: Profile;
}

export function VolunteerProfileContactPanel({ profile }: VolunteerProfileContactPanelProps) {
  const router = useRouter();
  const [values, setValues] = useState<VolunteerContactFormValues>(emptyVolunteerContactFormValues());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setValues({
      full_name: profile.full_name ?? "",
      email: profile.email,
      phone: profile.phone ?? "",
      birthday: profile.birthday ?? "",
      home_street: profile.home_street ?? "",
      home_city: profile.home_city ?? "",
      home_state: profile.home_state ?? "",
      home_zip: profile.home_zip ?? "",
      home_county: profile.home_county ?? "",
    });
  }, [profile]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!values.full_name.trim() || !values.phone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    if (!isHomeAddressComplete(values)) {
      setError("Home street, city, ZIP code, and county are required.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/profile/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: values.full_name,
        email: values.email,
        phone: values.phone,
        birthday: values.birthday || null,
        home_street: values.home_street,
        home_city: values.home_city,
        home_state: values.home_state,
        home_zip: values.home_zip,
        home_county: values.home_county,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to save contact information");
      return;
    }

    setSuccess("Your contact information has been updated.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact information</CardTitle>
        <CardDescription>
          Keep your phone, email, and home address current so the team can reach you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <VolunteerContactFieldsForm
            values={values}
            onChange={setValues}
            showBirthday
            idPrefix="profile-contact"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-primary">{success}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
