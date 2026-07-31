import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";
import { geocodeStreetAddress } from "@/lib/geocode";
import {
  contactFieldsToApplicationUpdate,
  contactFieldsToProfileUpdate,
  isHomeAddressComplete,
  type VolunteerContactUpdate,
} from "@/lib/volunteers/contact-fields";

export async function syncVolunteerContactRecords(
  service: SupabaseClient,
  params: {
    userId: string;
    previousEmail: string;
    fields: VolunteerContactUpdate;
    updateAuthEmail?: boolean;
    existingHomeAddress?: {
      home_street: string | null;
      home_city: string | null;
      home_state: string | null;
      home_zip: string | null;
      home_county: string | null;
    };
  }
): Promise<{ error?: string; email?: string }> {
  const profileUpdate = contactFieldsToProfileUpdate(params.fields) as Record<
    string,
    string | number | null
  >;
  const applicationUpdate = contactFieldsToApplicationUpdate(params.fields);

  if (Object.keys(profileUpdate).length === 0) {
    return { error: "No contact fields to update" };
  }

  const mergedAddress = {
    home_street:
      (profileUpdate.home_street as string | null | undefined) ??
      params.existingHomeAddress?.home_street ??
      null,
    home_city:
      (profileUpdate.home_city as string | null | undefined) ??
      params.existingHomeAddress?.home_city ??
      null,
    home_state:
      (profileUpdate.home_state as string | null | undefined) ??
      params.existingHomeAddress?.home_state ??
      null,
    home_zip:
      (profileUpdate.home_zip as string | null | undefined) ??
      params.existingHomeAddress?.home_zip ??
      null,
    home_county:
      (profileUpdate.home_county as string | null | undefined) ??
      params.existingHomeAddress?.home_county ??
      null,
  };

  const addressTouched =
    params.fields.home_street !== undefined ||
    params.fields.home_city !== undefined ||
    params.fields.home_state !== undefined ||
    params.fields.home_zip !== undefined ||
    params.fields.home_county !== undefined;

  if (addressTouched && isHomeAddressComplete(mergedAddress)) {
    try {
      const coords = await geocodeStreetAddress({
        street: mergedAddress.home_street,
        city: mergedAddress.home_city,
        state: mergedAddress.home_state,
        zip: mergedAddress.home_zip,
        county: mergedAddress.home_county,
      });
      if (coords) {
        profileUpdate.home_lat = coords.lat;
        profileUpdate.home_lng = coords.lng;
      }
    } catch (error) {
      console.warn("[contact-sync] home address geocode failed", error);
    }
  }

  let nextEmail = params.previousEmail.trim().toLowerCase();

  if (params.fields.email !== undefined) {
    const normalized = parsePrimaryEmail(params.fields.email);
    const emailError = getEmailValidationError(params.fields.email);
    if (!normalized || emailError) {
      return { error: emailError ?? "Invalid email address" };
    }

    if (normalized !== params.previousEmail.trim().toLowerCase()) {
      const { data: conflict } = await service
        .from("profiles")
        .select("id")
        .eq("email", normalized)
        .neq("id", params.userId)
        .maybeSingle();

      if (conflict) {
        return { error: "Another account already uses that email address." };
      }

      if (params.updateAuthEmail) {
        const { error: authError } = await service.auth.admin.updateUserById(params.userId, {
          email: normalized,
          email_confirm: true,
        });
        if (authError) {
          return { error: `Could not update login email: ${authError.message}` };
        }
      }

      nextEmail = normalized;
      profileUpdate.email = normalized;
      applicationUpdate.email = normalized;
    }
  }

  const { error: profileError } = await service
    .from("profiles")
    .update(profileUpdate)
    .eq("id", params.userId);

  if (profileError) {
    return { error: profileError.message };
  }

  if (Object.keys(applicationUpdate).length > 0) {
    const { data: existingApplication, error: applicationLookupError } = await service
      .from("volunteer_applications")
      .select("id")
      .eq("email", params.previousEmail)
      .maybeSingle();

    if (applicationLookupError) {
      return { error: applicationLookupError.message };
    }

    if (existingApplication) {
      const { error: applicationError } = await service
        .from("volunteer_applications")
        .update(applicationUpdate)
        .eq("id", existingApplication.id);

      if (applicationError) {
        return { error: applicationError.message };
      }
    }
  }

  return { email: nextEmail };
}
