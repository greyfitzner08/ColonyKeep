const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Short label for an API mutation, without query strings or request bodies. */
export function describeAuditAction(method: string, path: string): string {
  const verb = method.toUpperCase();
  const cleaned = path.split("?")[0] || path;
  const parts = cleaned
    .replace(/^\/api\//, "")
    .split("/")
    .filter((part) => part && !UUID_RE.test(part) && !/^\d+$/.test(part))
    .map((part) => part.replace(/-/g, " "));

  const target = parts.join(" · ") || cleaned;
  if (verb === "POST") return target;
  if (verb === "DELETE") return `Deleted ${target}`;
  if (verb === "PATCH" || verb === "PUT") return `Updated ${target}`;
  return `${verb} ${target}`;
}
