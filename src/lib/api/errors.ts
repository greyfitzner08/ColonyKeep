export function getApiErrorMessage(result: unknown, fallback: string): string {
  if (typeof result === "string" && result.trim()) {
    return result.trim();
  }

  if (!result || typeof result !== "object") {
    return fallback;
  }

  const record = result as Record<string, unknown>;
  const error = record.error ?? record.message;

  if (typeof error === "string" && error.trim() && error.trim() !== "{}") {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const nested = error as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim() && nested.message !== "{}") {
      return nested.message.trim();
    }
    if (typeof nested.error_description === "string" && nested.error_description.trim()) {
      return nested.error_description.trim();
    }
  }

  return fallback;
}
