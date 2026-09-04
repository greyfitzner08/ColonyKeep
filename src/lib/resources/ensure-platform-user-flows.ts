import { createServiceClient } from "@/lib/supabase/server";
import { PLATFORM_USER_FLOWS_MARKDOWN } from "@/lib/resources/platform-user-flows";

const TITLE = "Platform User Flows";
const SECTION = "Handbook";

/**
 * Ensures the Platform User Flows handbook exists (idempotent).
 * Admins can edit the stored markdown afterward via Resources.
 */
export async function ensurePlatformUserFlowsDocument(): Promise<void> {
  const service = await createServiceClient();

  const { data: existing } = await service
    .from("library_documents")
    .select("id, body_markdown")
    .eq("title", TITLE)
    .eq("section", SECTION)
    .maybeSingle();

  if (existing?.id) {
    const needsAccessModelRefresh =
      !existing.body_markdown?.trim() ||
      existing.body_markdown.includes("that unlock more tools") ||
      !existing.body_markdown.includes("Page access is controlled by platform role only");

    if (needsAccessModelRefresh) {
      await service
        .from("library_documents")
        .update({
          body_markdown: PLATFORM_USER_FLOWS_MARKDOWN,
          description:
            "Start-to-finish guide by platform role: Administrator, Inquiry, TNVR, and Volunteer.",
        })
        .eq("id", existing.id);
    }
    return;
  }

  await service.from("library_documents").insert({
    title: TITLE,
    description:
      "Start-to-finish guide by platform role: Administrator, Inquiry, TNVR, and Volunteer.",
    file_url: "",
    section: SECTION,
    view_roles: ["admin", "inquiry_team", "trap_team_lead", "volunteer"],
    is_active: true,
    body_markdown: PLATFORM_USER_FLOWS_MARKDOWN,
  });
}
