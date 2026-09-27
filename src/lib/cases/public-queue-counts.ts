import { TRAP_KANBAN_STATUSES } from "@/lib/cases/statuses";

/** Trap-queue statuses that still need volunteer work. */
export const PUBLIC_QUEUE_STATUSES = TRAP_KANBAN_STATUSES;

export function queuedCatCount(row: {
  cats_remaining: number | null;
  cats_over_8_weeks: number | null;
  kittens_under_8_weeks: number | null;
}): number {
  if (typeof row.cats_remaining === "number" && Number.isFinite(row.cats_remaining)) {
    return Math.max(0, row.cats_remaining);
  }
  return (
    Math.max(0, row.cats_over_8_weeks ?? 0) + Math.max(0, row.kittens_under_8_weeks ?? 0)
  );
}
