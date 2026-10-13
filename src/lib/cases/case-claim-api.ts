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

/** Admin-only: assign claim ownership to a TNVR user. */
export async function postCaseAssign(helpRequestId: string, assigneeProfileId: string) {
  return fetch("/api/help-requests/assign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ helpRequestId, assigneeProfileId }),
  });
}
