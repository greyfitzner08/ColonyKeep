import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { ShiftRequiredRole, ShiftType } from "@/lib/types";

interface ShiftCreateInput {
  event_name?: string;
  position_name?: string | null;
  shift_type?: ShiftType;
  required_roles?: ShiftRequiredRole;
  date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  volunteers_needed?: number;
  notes?: string | null;
  team_ids?: string[];
}

function normalizeShiftRow(entry: ShiftCreateInput, fallbackEventName?: string) {
  const eventName = String(entry.event_name ?? fallbackEventName ?? "").trim();
  const positionName = String(entry.position_name ?? "").trim();
  const date = String(entry.date ?? "").trim();
  const startTime = String(entry.start_time ?? "").trim();
  const endTime = String(entry.end_time ?? "").trim();
  const location = String(entry.location ?? "").trim();

  if (!eventName) return { error: "Event name is required." };
  if (!positionName) return { error: "Each shift needs a position name." };
  if (!date) return { error: "Each shift needs a date." };
  if (!startTime || !endTime) return { error: "Each shift needs a start and end time." };
  if (!location) return { error: "Each shift needs a location." };

  return {
    row: {
      event_name: eventName,
      position_name: positionName,
      shift_type: entry.shift_type ?? "event",
      required_roles: entry.required_roles ?? "any",
      date,
      start_time: startTime,
      end_time: endTime,
      location,
      volunteers_needed: Math.max(1, Number(entry.volunteers_needed) || 1),
      notes: entry.notes?.trim() ? entry.notes.trim() : null,
      team_ids: entry.team_ids ?? [],
      signed_up_emails: [] as string[],
    },
  };
}

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const service = await createServiceClient();

  // Batch create: { event_name, shifts: [...] }
  if (Array.isArray(body.shifts)) {
    if (body.shifts.length === 0) {
      return NextResponse.json({ error: "Add at least one shift opportunity." }, { status: 400 });
    }

    const rows = [];
    for (const [index, entry] of body.shifts.entries()) {
      const normalized = normalizeShiftRow(
        { ...(entry as ShiftCreateInput), event_name: body.event_name ?? (entry as ShiftCreateInput).event_name },
        body.event_name
      );
      if ("error" in normalized && normalized.error) {
        const label = String((entry as ShiftCreateInput).position_name ?? "").trim() || `Shift ${index + 1}`;
        return NextResponse.json(
          { error: `${label}: ${normalized.error}` },
          { status: 400 }
        );
      }
      rows.push(normalized.row!);
    }

    const { data, error } = await service.from("shifts").insert(rows).select();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ shifts: data, count: data?.length ?? 0 });
  }

  // Single create (edit-compatible / legacy)
  const normalized = normalizeShiftRow(body as ShiftCreateInput);
  if ("error" in normalized && normalized.error) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const { data, error } = await service
    .from("shifts")
    .insert(normalized.row!)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ shift: data });
}
