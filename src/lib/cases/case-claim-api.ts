export async function postCaseClaim(
  helpRequestId: string,
  action: "claim" | "unclaim" = "claim"
) {
  return fetch("/api/help-requests/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ helpRequestId, action }),
  });
}
