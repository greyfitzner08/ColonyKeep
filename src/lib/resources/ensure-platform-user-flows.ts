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
    if (!existing.body_markdown?.trim()) {
      await service
        .from("library_documents")
        .update({ body_markdown: PLATFORM_USER_FLOWS_MARKDOWN })
        .eq("id", existing.id);
    }
    return;
  }

  await service.from("library_documents").insert({
    title: TITLE,
    description:
      "Start-to-finish guide for each role: first login through daily caseload and event work.",
    file_url: "",
    section: SECTION,
    view_roles: ["admin", "inquiry_team", "trap_team_lead", "volunteer"],
    is_active: true,
    body_markdown: PLATFORM_USER_FLOWS_MARKDOWN,
  });
}
