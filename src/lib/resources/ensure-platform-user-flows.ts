import { createServiceClient } from "@/lib/supabase/server";
import {
  PLATFORM_USER_FLOWS_DOC_VERSION,
  PLATFORM_USER_FLOWS_MARKDOWN,
} from "@/lib/resources/platform-user-flows";

const TITLE = "Platform User Flows";
const SECTION = "Handbook";

function needsHandbookRefresh(body: string | null | undefined): boolean {
  if (!body?.trim()) return true;
  if (!body.includes(`flows-doc-version: ${PLATFORM_USER_FLOWS_DOC_VERSION}`)) return true;
  // Legacy copies that predate the version marker / current product.
  if (body.includes("Inquiry Queue")) return true;
  if (body.includes("**Inquiry Team**")) return true;
  if (body.includes("Appointments (reserve clinic slots")) return true;
  if (body.includes("Sign Up (or join waitlist)")) return true;
  if (body.includes("that unlock more tools")) return true;
  if (!body.includes("Page access is controlled by platform role only")) return true;
  return false;
}

/**
 * Ensures the Platform User Flows handbook exists and matches the current seed
 * when the stored version is behind (idempotent). Admins can still edit afterward.
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
    if (needsHandbookRefresh(existing.body_markdown)) {
      await service
        .from("library_documents")
        .update({
          body_markdown: PLATFORM_USER_FLOWS_MARKDOWN,
          description:
            "Start-to-finish guide by platform role: Administrator, TNVR, and Volunteer.",
        })
        .eq("id", existing.id);
    }
    return;
  }

  await service.from("library_documents").insert({
    title: TITLE,
    description:
      "Start-to-finish guide by platform role: Administrator, TNVR, and Volunteer.",
    file_url: "",
    section: SECTION,
    view_roles: ["admin", "trap_team_lead", "volunteer"],
    is_active: true,
    body_markdown: PLATFORM_USER_FLOWS_MARKDOWN,
  });
}
