import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { normalizeHistoryLog } from "@/lib/cases/history-log";
import { updateHelpRequestCatCounts } from "@/lib/cases/tracked-cat-fix";
import { createServiceClient } from "@/lib/supabase/server";
import type { HistoryEntry } from "@/lib/types";

function parseNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return null;
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const helpRequestId =
    typeof body?.helpRequestId === "string" ? body.helpRequestId : undefined;
  const adults = parseNonNegativeInt(body?.adults);
  const kittens = parseNonNegativeInt(body?.kittens);

  if (!helpRequestId || adults == null || kittens == null) {
    return NextResponse.json(
      { error: "Missing helpRequestId, adults, or kittens." },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const { data: existing, error: loadError } = await service
    .from("help_requests")
    .select(
      "id, reported_cats_over_8_weeks, reported_kittens_under_8_weeks, cats_over_8_weeks, kittens_under_8_weeks, history_log"
    )
    .eq("id", helpRequestId)
    .single();

  if (loadError || !existing) {
    return NextResponse.json(
      { error: loadError?.message ?? "Case not found" },
      { status: loadError ? 400 : 404 }
    );
  }

  const previousAdults = existing.reported_cats_over_8_weeks ?? existing.cats_over_8_weeks ?? 0;
  const previousKittens =
    existing.reported_kittens_under_8_weeks ?? existing.kittens_under_8_weeks ?? 0;

  if (previousAdults === adults && previousKittens === kittens) {
    return NextResponse.json({
      success: true,
      unchanged: true,
      reported_cats_over_8_weeks: adults,
      reported_kittens_under_8_weeks: kittens,
      cats_over_8_weeks: existing.cats_over_8_weeks ?? 0,
      kittens_under_8_weeks: existing.kittens_under_8_weeks ?? 0,
      cats_remaining:
        (existing.cats_over_8_weeks ?? 0) + (existing.kittens_under_8_weeks ?? 0),
      history_log: normalizeHistoryLog(existing.history_log),
    });
  }

  const historyEntry: HistoryEntry = {
    timestamp: new Date().toISOString(),
    action: "reported_counts_corrected",
    actor_email: profile!.email ?? null,
    actor_name: profile!.full_name ?? profile!.email ?? "Admin",
    details: `Corrected originally reported cats: ${previousAdults} adults / ${previousKittens} kittens → ${adults} adults / ${kittens} kittens.`,
    highlighted: false,
  };
  const history_log = [...normalizeHistoryLog(existing.history_log), historyEntry];

  const { error: writeError } = await service
    .from("help_requests")
    .update({
      reported_cats_over_8_weeks: adults,
      reported_kittens_under_8_weeks: kittens,
      history_log,
    })
    .eq("id", helpRequestId);

  if (writeError) {
    return NextResponse.json({ error: writeError.message }, { status: 400 });
  }

  try {
    const counts = await updateHelpRequestCatCounts(service, helpRequestId, {
      ignoreStoredRemaining: true,
    });
    return NextResponse.json({
      success: true,
      ...counts,
      history_log,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Reported counts saved, but remaining cats could not be recalculated.",
      },
      { status: 400 }
    );
  }
}
