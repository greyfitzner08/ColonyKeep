import { createServiceClient } from "@/lib/supabase/server";
import { TNVR_VIDEO_TUTORIAL_SCRIPT_MARKDOWN } from "@/lib/resources/tnvr-video-tutorial-script";

const TITLE = "TNVR Video Tutorial Script";
const SECTION = "Handbook";
const DESCRIPTION =
  "Narration to read aloud for a TNVR Team screen recording: claim, contact, trap, Add cats, close.";

function needsScriptRefresh(body: string | null | undefined): boolean {
  if (!body?.trim()) return true;
  return body.trim() !== TNVR_VIDEO_TUTORIAL_SCRIPT_MARKDOWN.trim();
}

/** Ensures the TNVR video narration script exists and matches the current seed. */
export async function ensureTnvrVideoTutorialScriptDocument(): Promise<void> {
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
          body_markdown: TNVR_VIDEO_TUTORIAL_SCRIPT_MARKDOWN,
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
    body_markdown: TNVR_VIDEO_TUTORIAL_SCRIPT_MARKDOWN,
  });
}
