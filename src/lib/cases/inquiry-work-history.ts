import type { SupabaseClient } from "@supabase/supabase-js";
import type { HelpRequest } from "@/lib/types";
import { normalizeHistoryLog } from "@/lib/cases/history-log";

/** Cases an inquiry volunteer previously worked that have left the inquiry queue. */
export async function fetchInquiryWorkHistory(
  supabase: SupabaseClient,
  email: string,
  limit = 100
): Promise<HelpRequest[]> {
  const trimmed = email.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase.rpc("inquiry_work_history", {
    p_email: trimmed,
    p_limit: limit,
  });

  if (error) {
    console.error("inquiry_work_history:", error.message);
    return [];
  }

  return ((data ?? []) as HelpRequest[]).map((hr) => ({
    ...hr,
    history_log: normalizeHistoryLog(hr.history_log),
  }));
}
