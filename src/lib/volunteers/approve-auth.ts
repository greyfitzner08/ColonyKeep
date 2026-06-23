import type { SupabaseClient } from "@supabase/supabase-js";
import { formatAuthError } from "@/lib/auth-errors";

interface AuthUserResult {
  userId: string;
  passwordSetupUrl: string | null;
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

export async function ensureVolunteerAuthUser(
  service: SupabaseClient,
  email: string,
  fullName: string,
  appUrl: string
): Promise<AuthUserResult | AuthUserError> {
  const redirectCandidates = [
    `${appUrl}/auth/callback?next=/set-password`,
    `${appUrl}/auth/callback`,
    `${appUrl}/set-password`,
  ];

  let userId = await findAuthUserIdByEmail(service, email);

  if (!userId) {
    const createResult = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createResult.error) {
      const existingUserId = await findAuthUserIdByEmail(service, email);
      if (!existingUserId) {
        const message = createResult.error.message?.trim();
        return {
          error: message
            ? `Could not create volunteer login: ${message}`
            : "Could not create volunteer login. Check Supabase Auth settings and try again.",
        };
      }
      userId = existingUserId;
    } else {
      userId = createResult.data.user?.id ?? (await findAuthUserIdByEmail(service, email));
    }
  }

  if (!userId) {
    return { error: "Could not create or find a login account for this volunteer." };
  }

  const passwordSetupUrl = await tryGeneratePasswordLink(
    service,
    email,
    fullName,
    redirectCandidates
  );

  if (passwordSetupUrl) {
    return { userId, passwordSetupUrl };
  }

  return {
    userId,
    passwordSetupUrl: null,
    warning:
      "Volunteer account created. They can sign in at the login page and use Forgot Password to set their password.",
  };
}

export function formatAuthSetupError(error: unknown, redirectTo?: string): string {
  return formatAuthError(error, redirectTo);
}
