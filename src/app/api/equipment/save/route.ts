import { NextRequest, NextResponse } from "next/server";
import { requireTrapEquipmentAccess } from "@/lib/api/auth";
import { isTnvrVolunteerProfile } from "@/lib/equipment/volunteers";
import { createServiceClient } from "@/lib/supabase/server";
import type { TrapEquipmentStatus, TrapEquipmentType } from "@/lib/types";

const VALID_TYPES: TrapEquipmentType[] = [
  "gravity_trap",
  "drop_trap",
  "transfer_trap",
  "microchip_scanner",
  "trap_divider",
  "other",
];

const VALID_STATUSES: TrapEquipmentStatus[] = [
  "available",
  "loaned",
  "maintenance",
  "retired",
];

function trimOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireTrapEquipmentAccess();
  if (response) return response;

  const body = await request.json();
  const equipmentType = body.equipment_type as TrapEquipmentType;
  const status = (body.status ?? "available") as TrapEquipmentStatus;
  const quantity = Number(body.quantity ?? 1);

  if (!VALID_TYPES.includes(equipmentType)) {
    return NextResponse.json({ error: "Invalid equipment type" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
  }

  const isAdmin = profile!.role === "admin";
  let teamId = body.team_id ?? null;
  let teamName = body.team_name ?? null;

  if (!isAdmin) {
    teamId = profile!.team_id;
    if (!teamId) {
      return NextResponse.json(
        { error: "You must be assigned to a trap team to log equipment" },
        { status: 400 }
      );
    }
  }

  const service = await createServiceClient();
  if (teamId && !teamName) {
    const { data: team } = await service
      .from("trap_teams")
      .select("name")
      .eq("id", teamId)
      .maybeSingle();
    teamName = team?.name ?? null;
  }

  let assignedToProfileId = trimOrNull(body.assigned_to_profile_id);

  if (assignedToProfileId) {
    const { data: assignee } = await service
      .from("profiles")
      .select("id, team_id, role, volunteer_roles")
      .eq("id", assignedToProfileId)
      .maybeSingle();

    if (!assignee || !isTnvrVolunteerProfile(assignee)) {
      return NextResponse.json({ error: "Select a valid TNVR volunteer" }, { status: 400 });
    }

    if (!isAdmin && teamId && assignee.team_id !== teamId) {
      return NextResponse.json(
        { error: "Volunteer must be on your trap team" },
        { status: 400 }
      );
    }
  }

  let borrowerName = trimOrNull(body.borrower_name);
  let borrowerEmail = trimOrNull(body.borrower_email);
  let borrowerPhone = trimOrNull(body.borrower_phone);

  if (status !== "loaned") {
    borrowerName = null;
    borrowerEmail = null;
    borrowerPhone = null;
  }

  const payload = {
    equipment_type: equipmentType,
    description: body.description ?? null,
    quantity: Math.floor(quantity),
    status,
    team_id: teamId,
    team_name: teamName,
    location: body.location ?? null,
    notes: body.notes ?? null,
    is_labeled: Boolean(body.is_labeled),
    equipment_label:
      body.is_labeled && typeof body.equipment_label === "string"
        ? body.equipment_label.trim() || null
        : null,
    qr_code_data:
      typeof body.qr_code_data === "string" ? body.qr_code_data.trim() || null : null,
    assigned_to_profile_id: assignedToProfileId,
    borrower_name: borrowerName,
    borrower_email: borrowerEmail,
    borrower_phone: borrowerPhone,
    logged_by_email: profile!.email,
    logged_by_name: profile!.full_name,
  };

  const query = body.id
    ? service.from("trap_equipment_items").update(payload).eq("id", body.id)
    : service.from("trap_equipment_items").insert(payload);

  const { data, error } = await query.select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}
