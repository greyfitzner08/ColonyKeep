export function formatAuthError(error: unknown, redirectTo?: string): string {
  if (!error || typeof error !== "object") {
    return "Authentication service returned an unknown error.";
  }

  const authError = error as {
    message?: string;
    status?: number;
    code?: string;
    name?: string;
  };

  const message = authError.message?.trim();
  if (message && message !== "{}" && message !== "[object Object]") {
    return message;
  }

  if (authError.status === 422) {
    return `Supabase rejected the login redirect URL${redirectTo ? `: ${redirectTo}` : ""}. Add it under Supabase → Authentication → URL Configuration → Redirect URLs.`;
  }

  if (authError.status === 500) {
    return `Supabase auth failed. Confirm your Site URL and Redirect URLs include ${redirectTo ?? "your production domain"} in Supabase → Authentication → URL Configuration.`;
  }

  if (authError.code) {
    return `Authentication failed: ${authError.code}`;
  }

  return "Could not create a login account for this volunteer. Check Supabase Auth URL settings and try again.";
}

export function isAlreadyRegisteredAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const authError = error as { message?: string; code?: string; status?: number };
  const message = authError.message ?? "";
  return (
    authError.code === "email_exists" ||
    /already registered|already exists|user already|email address has already been registered/i.test(
      message
    )
  );
}
