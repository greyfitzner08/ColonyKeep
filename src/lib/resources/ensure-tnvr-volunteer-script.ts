import { createServiceClient } from "@/lib/supabase/server";
import { TNVR_VOLUNTEER_SCRIPT_MARKDOWN } from "@/lib/resources/tnvr-volunteer-script";

const TITLE = "TNVR Volunteer Script";
const SECTION = "Handbook";
const DESCRIPTION =
  "Start-to-finish case work for TNVR Team volunteers: claim, trap, log clinic results, and close. Download as PDF.";

function needsScriptRefresh(body: string | null | undefined): boolean {
  if (!body?.trim()) return true;
  if (body.includes("tnvr-script-version:")) return true;
  return body.trim() !== TNVR_VOLUNTEER_SCRIPT_MARKDOWN.trim();
}

/** Ensures the printable TNVR volunteer script exists and matches the current seed. */
export async function ensureTnvrVolunteerScriptDocument(): Promise<void> {
  const service = await createServiceClient();

  const { data: existing } = await service
    .from("library_documents")
    .select("id, body_markdown")
    .eq("title", TITLE)
    .eq("section", SECTION)
    .maybeSingle();

  if (existing?.id) {
    if (needsScriptRefresh(existing.body_markdown)) {
      await service
        .from("library_documents")
        .update({
          body_markdown: TNVR_VOLUNTEER_SCRIPT_MARKDOWN,
          description: DESCRIPTION,
        })
        .eq("id", existing.id);
    }
    return;
  }

  await service.from("library_documents").insert({
    title: TITLE,
    description: DESCRIPTION,
    file_url: "",
    section: SECTION,
    view_roles: ["admin", "trap_team_lead", "volunteer"],
    is_active: true,
    body_markdown: TNVR_VOLUNTEER_SCRIPT_MARKDOWN,
  });
}
