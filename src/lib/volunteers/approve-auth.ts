import type { SupabaseClient } from "@supabase/supabase-js";
import { formatAuthError } from "@/lib/auth-errors";
import { getDefaultVolunteerPassword } from "@/lib/volunteers/default-password";

interface AuthUserResult {
  userId: string;
  isNewUser: boolean;
  warning?: string;
}

interface AuthUserError {
  error: string;
}

export async function findAuthUserIdByEmail(
  service: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalizedEmail = email.toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail
    );
    if (match?.id) return match.id;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function tryGeneratePasswordLink(
  service: SupabaseClient,
  email: string,
  fullName: string,
  redirectCandidates: string[]
): Promise<string | null> {
  for (const redirectTo of redirectCandidates) {
    const inviteResult = await service.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo,
        data: { full_name: fullName },
      },
    });

    if (!inviteResult.error && inviteResult.data.properties?.action_link) {
      return inviteResult.data.properties.action_link;
    }

    const recoveryResult = await service.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (!recoveryResult.error && recoveryResult.data.properties?.action_link) {
      return recoveryResult.data.properties.action_link;
    }
  }

  return null;
}

/** @deprecated Invite links replaced by default temp password; kept for manual admin recovery. */
export async function generateVolunteerPasswordSetupLink(
  service: SupabaseClient,
  email: string,
  fullName: string,
  appUrl: string
): Promise<string | null> {
  return tryGeneratePasswordLink(service, email, fullName, [
    `${appUrl}/auth/callback?next=/set-password`,
    `${appUrl}/auth/callback`,
    `${appUrl}/set-password`,
  ]);
}

export async function ensureVolunteerAuthUser(
  service: SupabaseClient,
  email: string,
  fullName: string,
  _appUrl: string
): Promise<AuthUserResult | AuthUserError> {
  let userId = await findAuthUserIdByEmail(service, email);
  let isNewUser = false;

  if (!userId) {
    isNewUser = true;
    const createResult = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      password: getDefaultVolunteerPassword(),
      user_metadata: { full_name: fullName },
    });

    if (createResult.error) {
      const existingUserId = await findAuthUserIdByEmail(service, email);
      if (!existingUserId) {
        const message = createResult.error.message?.trim();
        if (message && /jwt|kid|es256|signature/i.test(message)) {
          return {
            error:
              "Could not create volunteer login: Supabase Auth rejected the server API key. " +
              "In Supabase → Settings → API Keys, copy the current service_role key (or create an sb_secret_... key), " +
              "set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY in Vercel, remove any wrong SUPABASE_SECRET_KEY value, and redeploy.",
          };
        }
        return {
          error: message
            ? `Could not create volunteer login: ${message}`
            : "Could not create volunteer login. Check Supabase Auth settings and try again.",
        };
      }
      userId = existingUserId;
      isNewUser = false;
    } else {
      userId = createResult.data.user?.id ?? (await findAuthUserIdByEmail(service, email));
    }
  }

  if (!userId) {
    return { error: "Could not create or find a login account for this volunteer." };
  }

  return { userId, isNewUser };
}

export async function resetVolunteerTemporaryPassword(
  service: SupabaseClient,
  email: string,
  fullName: string
): Promise<{ userId: string; created: boolean } | AuthUserError> {
  const password = getDefaultVolunteerPassword();
  let userId = await findAuthUserIdByEmail(service, email);
  let created = false;

  if (!userId) {
    const createResult = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { full_name: fullName },
    });

    if (createResult.error) {
      const message = createResult.error.message?.trim();
      return {
        error: message
          ? `Could not create volunteer login: ${message}`
          : "Could not create volunteer login.",
      };
    }

    userId = createResult.data.user?.id ?? (await findAuthUserIdByEmail(service, email));
    created = true;
  } else {
    const { error } = await service.auth.admin.updateUserById(userId, { password });
    if (error) {
      return { error: error.message ?? "Could not reset volunteer password." };
    }
  }

  if (!userId) {
    return { error: "Could not find or create a login account for this volunteer." };
  }

  return { userId, created };
}

/** Ban auth login so inactive volunteers cannot sign in until re-approved. */
export async function banVolunteerAuthUser(
  service: SupabaseClient,
  email: string
): Promise<{ userId: string } | AuthUserError | { skipped: true }> {
  const userId = await findAuthUserIdByEmail(service, email);
  if (!userId) return { skipped: true };

  // ~100 years — effectively permanent until an admin unbans on re-approval.
  const { error } = await service.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (error) {
    return { error: error.message ?? "Could not deactivate volunteer login." };
  }
  return { userId };
}

/** Clear ban so a re-approved volunteer can sign in again. */
export async function unbanVolunteerAuthUser(
  service: SupabaseClient,
  email: string
): Promise<{ userId: string } | AuthUserError | { skipped: true }> {
  const userId = await findAuthUserIdByEmail(service, email);
  if (!userId) return { skipped: true };

  const { error } = await service.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (error) {
    return { error: error.message ?? "Could not reactivate volunteer login." };
  }
  return { userId };
}

export function formatAuthSetupError(error: unknown, redirectTo?: string): string {
  return formatAuthError(error, redirectTo);
}
