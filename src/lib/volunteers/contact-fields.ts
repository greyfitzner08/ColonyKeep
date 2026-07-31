import type { Profile, VolunteerApplication } from "@/lib/types";

export interface VolunteerHomeAddress {
  home_street: string | null;
  home_city: string | null;
  home_state: string | null;
  home_zip: string | null;
  home_county: string | null;
}

export interface VolunteerContactFields {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  home_street: string | null;
  home_city: string | null;
  home_state: string | null;
  home_zip: string | null;
  home_county: string | null;
}

export type VolunteerContactUpdate = Partial<VolunteerContactFields>;

export function homeAddressFromProfile(
  profile: Pick<
    Profile,
    "home_street" | "home_city" | "home_state" | "home_zip" | "home_county"
  >
): VolunteerHomeAddress {
  return {
    home_street: profile.home_street ?? null,
    home_city: profile.home_city ?? null,
    home_state: profile.home_state ?? null,
    home_zip: profile.home_zip ?? null,
    home_county: profile.home_county ?? null,
  };
}

export function volunteerContactFromProfile(profile: Profile): VolunteerContactFields {
  return {
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    birthday: profile.birthday,
    ...homeAddressFromProfile(profile),
  };
}

export function volunteerContactFromApplication(
  application: VolunteerApplication
): VolunteerContactFields {
  return {
    full_name: application.full_name,
    email: application.email,
    phone: application.phone,
    birthday: application.birthday,
    home_street: application.home_street ?? null,
    home_city: application.home_city ?? null,
    home_state: application.home_state ?? null,
    home_zip: application.home_zip ?? null,
    home_county: application.home_county ?? null,
  };
}

export function isHomeAddressComplete(
  address: Pick<
    VolunteerHomeAddress,
    "home_street" | "home_city" | "home_zip" | "home_county"
  >
): boolean {
  return Boolean(
    address.home_street?.trim() &&
      address.home_city?.trim() &&
      address.home_zip?.trim() &&
      address.home_county?.trim()
  );
}

export function formatHomeAddress(fields: VolunteerHomeAddress): string {
  const street = fields.home_street?.trim();
  const city = fields.home_city?.trim();
  const state = fields.home_state?.trim();
  const zip = fields.home_zip?.trim();
  const county = fields.home_county?.trim();

  if (!street) return "—";

  const locality = [city, state, zip].filter(Boolean).join(", ");
  return county ? `${street}, ${locality} (${county})` : `${street}, ${locality}`;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function parseVolunteerContactUpdate(body: Record<string, unknown>): VolunteerContactUpdate {
  const update: VolunteerContactUpdate = {};

  if ("fullName" in body || "full_name" in body) {
    update.full_name = trimOrNull(body.fullName ?? body.full_name);
  }
  if ("email" in body) {
    update.email = trimOrNull(body.email);
  }
  if ("phone" in body) {
    update.phone = trimOrNull(body.phone);
  }
  if ("birthday" in body) {
    update.birthday = trimOrNull(body.birthday);
  }
  if ("home_street" in body || "homeStreet" in body) {
    update.home_street = trimOrNull(body.home_street ?? body.homeStreet);
  }
  if ("home_city" in body || "homeCity" in body) {
    update.home_city = trimOrNull(body.home_city ?? body.homeCity);
  }
  if ("home_state" in body || "homeState" in body) {
    update.home_state = trimOrNull(body.home_state ?? body.homeState);
  }
  if ("home_zip" in body || "homeZip" in body) {
    update.home_zip = trimOrNull(body.home_zip ?? body.homeZip);
  }
  if ("home_county" in body || "homeCounty" in body) {
    update.home_county = trimOrNull(body.home_county ?? body.homeCounty);
  }

  return update;
}

export function contactFieldsToProfileUpdate(
  fields: VolunteerContactUpdate
): Record<string, string | null> {
  const update: Record<string, string | null> = {};
  if (fields.full_name !== undefined) update.full_name = fields.full_name;
  if (fields.email !== undefined) update.email = fields.email ?? "";
  if (fields.phone !== undefined) update.phone = fields.phone;
  // Birthday is a DATE column — empty string is invalid Postgres input.
  if (fields.birthday !== undefined) update.birthday = fields.birthday?.trim() || null;
  if (fields.home_street !== undefined) update.home_street = fields.home_street;
  if (fields.home_city !== undefined) update.home_city = fields.home_city;
  if (fields.home_state !== undefined) update.home_state = fields.home_state;
  if (fields.home_zip !== undefined) update.home_zip = fields.home_zip;
  if (fields.home_county !== undefined) update.home_county = fields.home_county;
  return update;
}

export function contactFieldsToApplicationUpdate(
  fields: VolunteerContactUpdate
): Record<string, string | null> {
  const update: Record<string, string | null> = {};
  if (fields.full_name !== undefined) update.full_name = fields.full_name ?? "";
  if (fields.email !== undefined) update.email = fields.email ?? "";
  if (fields.phone !== undefined) update.phone = fields.phone ?? "";
  // Birthday is a DATE column — empty string is invalid Postgres input.
  if (fields.birthday !== undefined) update.birthday = fields.birthday?.trim() || null;
  if (fields.home_street !== undefined) update.home_street = fields.home_street;
  if (fields.home_city !== undefined) update.home_city = fields.home_city;
  if (fields.home_state !== undefined) update.home_state = fields.home_state;
  if (fields.home_zip !== undefined) update.home_zip = fields.home_zip;
  if (fields.home_county !== undefined) update.home_county = fields.home_county;
  return update;
}
