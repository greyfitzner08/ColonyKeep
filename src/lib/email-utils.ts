const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function parsePrimaryEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const candidates = raw
    .split(/[\n,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (isValidEmail(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getEmailValidationError(raw: string | null | undefined): string | null {
  const email = parsePrimaryEmail(raw);
  if (email) return null;
  return "Enter a valid email address before approving this volunteer.";
}
