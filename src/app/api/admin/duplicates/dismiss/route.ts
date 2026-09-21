import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  duplicatePairKeysForIds,
  parseDuplicatePairKey,
  type DismissedDuplicateEntityType,
} from "@/lib/admin/dismissed-duplicates";
import { createServiceClient } from "@/lib/supabase/server";

type DismissRow = {
  entity_type: DismissedDuplicateEntityType;
  left_id: string;
  right_id: string;
  dismissed_by: string | null;
};

function rowsForIds(
  entityType: DismissedDuplicateEntityType,
  ids: string[],
  dismissedBy: string | null
): DismissRow[] {
  return duplicatePairKeysForIds(ids)
    .map((key) => parseDuplicatePairKey(key))
    .filter((pair): pair is { leftId: string; rightId: string } => Boolean(pair))
    .map((pair) => ({
      entity_type: entityType,
      left_id: pair.leftId,
      right_id: pair.rightId,
      dismissed_by: dismissedBy,
    }));
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const entityType = body?.entityType as DismissedDuplicateEntityType | undefined;
  const ids = Array.isArray(body?.ids)
    ? (body.ids as unknown[]).map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];

  if (entityType !== "profile" && entityType !== "application") {
    return NextResponse.json(
      { error: "entityType must be “profile” or “application”." },
      { status: 400 }
    );
  }
  if (ids.length < 2) {
    return NextResponse.json(
      { error: "Select at least two records to mark as not duplicates." },
      { status: 400 }
    );
  }

  const dismissedBy = profile?.id ?? null;
  const rows: DismissRow[] = rowsForIds(entityType, ids, dismissedBy);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No pairs to dismiss." }, { status: 400 });
  }

  const service = await createServiceClient();
  const linkedProfileIds: string[] = [];
  const linkedApplicationIds: string[] = [];

  // Keep-both should clear both the application banner and the linked-account banner
  // for the same people.
  if (entityType === "application") {
    const { data: apps, error: appsError } = await service
      .from("volunteer_applications")
      .select("id, email")
      .in("id", ids);
    if (appsError) {
      return NextResponse.json({ error: appsError.message }, { status: 400 });
    }

    const emails = Array.from(
      new Set(
        (apps ?? [])
          .map((app) => String(app.email ?? "").trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (emails.length > 0) {
      const { data: profiles, error: profilesError } = await service
        .from("profiles")
        .select("id, email");
      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 400 });
      }

      const emailSet = new Set(emails);
      for (const entry of profiles ?? []) {
        const email = String(entry.email ?? "").trim().toLowerCase();
        if (!emailSet.has(email)) continue;
        linkedProfileIds.push(entry.id);
      }

      if (linkedProfileIds.length >= 2) {
        rows.push(...rowsForIds("profile", linkedProfileIds, dismissedBy));
      }
    }
  } else {
    const { data: profiles, error: profilesError } = await service
      .from("profiles")
      .select("id, email")
      .in("id", ids);
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 400 });
    }

    const emails = Array.from(
      new Set(
        (profiles ?? [])
          .map((entry) => String(entry.email ?? "").trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (emails.length > 0) {
      const { data: apps, error: appsError } = await service
        .from("volunteer_applications")
        .select("id, email");
      if (appsError) {
        return NextResponse.json({ error: appsError.message }, { status: 400 });
      }

      const emailSet = new Set(emails);
      for (const app of apps ?? []) {
        const email = String(app.email ?? "").trim().toLowerCase();
        if (!emailSet.has(email)) continue;
        linkedApplicationIds.push(app.id);
      }

      if (linkedApplicationIds.length >= 2) {
        rows.push(...rowsForIds("application", linkedApplicationIds, dismissedBy));
      }
    }
  }

  // De-dupe in case cross-link produced overlapping rows.
  const uniqueRows = Array.from(
    new Map(rows.map((row) => [`${row.entity_type}:${row.left_id}:${row.right_id}`, row])).values()
  );

  const { error } = await service.from("dismissed_duplicate_pairs").upsert(uniqueRows, {
    onConflict: "entity_type,left_id,right_id",
    ignoreDuplicates: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    dismissedPairs: uniqueRows.length,
    linkedProfileIds,
    linkedApplicationIds,
  });
}
