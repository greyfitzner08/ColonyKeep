import type { SupabaseClient } from "@supabase/supabase-js";
import type { HelpRequest } from "@/lib/types";
import { normalizeHistoryLog } from "@/lib/cases/history-log";

export interface FetchUserCaseWorkHistoryOptions {
  limit?: number;
  /** When true, omit cases still in the inquiry queue (past handoff view). */
  excludeIntakeQueue?: boolean;
}

function mapRows(data: HelpRequest[] | null): HelpRequest[] {
  return (data ?? []).map((hr) => ({
    ...hr,
    history_log: normalizeHistoryLog(hr.history_log),
  }));
}

/** Cases this volunteer has claimed, annotated, reserved, or logged clinic work on. */
export async function fetchUserCaseWorkHistory(
  supabase: SupabaseClient,
  email: string,
  options: FetchUserCaseWorkHistoryOptions = {}
): Promise<HelpRequest[]> {
  const trimmed = email.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase.rpc("user_case_work_history", {
    p_email: trimmed,
    p_limit: options.limit ?? 100,
    p_exclude_intake_queue: options.excludeIntakeQueue ?? false,
  });

  if (error) {
    console.error("user_case_work_history:", error.message);
    return [];
  }

  return mapRows(data as HelpRequest[] | null);
}

/** Inquiry handoff history — cases they worked that have left the inquiry queue. */
export async function fetchInquiryWorkHistory(
  supabase: SupabaseClient,
  email: string,
  limit = 100
): Promise<HelpRequest[]> {
  return fetchUserCaseWorkHistory(supabase, email, {
    limit,
    excludeIntakeQueue: true,
  });
}
