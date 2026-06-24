import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";
import {
  contactFieldsToApplicationUpdate,
  contactFieldsToProfileUpdate,
  type VolunteerContactUpdate,
} from "@/lib/volunteers/contact-fields";

export async function syncVolunteerContactRecords(
  service: SupabaseClient,
  params: {
    userId: string;
    previousEmail: string;
    fields: VolunteerContactUpdate;
    updateAuthEmail?: boolean;
  }
): Promise<{ error?: string; email?: string }> {
  const profileUpdate = contactFieldsToProfileUpdate(params.fields);
  const applicationUpdate = contactFieldsToApplicationUpdate(params.fields);

  if (Object.keys(profileUpdate).length === 0) {
    return { error: "No contact fields to update" };
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
    const { error: applicationError } = await service
      .from("volunteer_applications")
      .update(applicationUpdate)
      .eq("email", params.previousEmail);

    if (applicationError) {
      return { error: applicationError.message };
    }
  }

  return { email: nextEmail };
}
