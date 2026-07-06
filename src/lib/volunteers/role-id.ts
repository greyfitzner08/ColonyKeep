const ROLE_ID_PATTERN = /^[a-z][a-z0-9_]{0,48}$/;

export function normalizeRoleId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function isValidRoleId(roleId: string): boolean {
  return ROLE_ID_PATTERN.test(roleId);
}

export function roleIdValidationError(roleId: string): string | null {
  const normalized = normalizeRoleId(roleId);
  if (!normalized) {
    return "Enter a role id (lowercase letters, numbers, underscores).";
  }
  if (!isValidRoleId(normalized)) {
    return "Role id must start with a letter and use only lowercase letters, numbers, and underscores.";
  }
  return null;
}
