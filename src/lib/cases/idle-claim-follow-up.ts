import type { SupabaseClient } from "@supabase/supabase-js";
import { TRAP_QUEUE_STATUSES } from "@/lib/cases/statuses";

/** Claimed trap cases with no edits for this many days show a follow-up banner. */
export const IDLE_CLAIM_FOLLOW_UP_DAYS = 21;

export interface IdleClaimFollowUpAlert {
  id: string;
  caseNumber: string;
  contactName: string;
  updatedAt: string;
  idleDays: number;
}

/** Whole days since `updatedAt`. */
export function idleClaimDays(updatedAt: string, asOf = new Date()): number {
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) return 0;
  const ms = asOf.getTime() - updated.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function idleClaimTimingLabel(idleDays: number): string {
  if (idleDays <= 0) return "updated today";
  if (idleDays === 1) return "untouched for 1 day";
  return `untouched for ${idleDays} days`;
}

export function idleClaimCutoffIso(
  asOf = new Date(),
  days = IDLE_CLAIM_FOLLOW_UP_DAYS
): string {
  const cutoff = new Date(asOf.getTime() - days * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

/** Active trap-queue cases claimed by this user and idle for 21+ days. */
export async function fetchIdleClaimFollowUps(
  supabase: SupabaseClient,
  userEmail: string,
  asOf = new Date()
): Promise<IdleClaimFollowUpAlert[]> {
  const email = userEmail.trim();
  if (!email) return [];

  const { data, error } = await supabase
    .from("help_requests")
    .select("id, case_number, contact_name, updated_at")
    .in("status", TRAP_QUEUE_STATUSES)
    .eq("claimed_by_email", email)
    .lte("updated_at", idleClaimCutoffIso(asOf))
    .order("updated_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const updatedAt = row.updated_at ?? "";
    return {
      id: row.id as string,
      caseNumber: (row.case_number as string | null)?.trim() || "Case",
      contactName: (row.contact_name as string | null)?.trim() || "Unknown contact",
      updatedAt,
      idleDays: idleClaimDays(updatedAt, asOf),
    };
  });
}
