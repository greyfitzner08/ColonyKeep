import type { TrapEquipmentType } from "@/lib/types";
import { TRAP_EQUIPMENT_TYPES } from "@/lib/equipment/constants";

export interface ParsedEquipmentQr {
  equipment_type?: TrapEquipmentType;
  equipment_label?: string;
  is_labeled?: boolean;
  description?: string;
  location?: string;
  notes?: string;
  qr_code_data: string;
}

const TYPE_ALIASES: Record<string, TrapEquipmentType> = {
  gravity_trap: "gravity_trap",
  gravity: "gravity_trap",
  drop_trap: "drop_trap",
  drop: "drop_trap",
  transfer_trap: "transfer_trap",
  transfer: "transfer_trap",
  microchip_scanner: "microchip_scanner",
  scanner: "microchip_scanner",
  microchip: "microchip_scanner",
  trap_divider: "trap_divider",
  divider: "trap_divider",
  other: "other",
};

function normalizeEquipmentType(value: unknown): TrapEquipmentType | undefined {
  if (typeof value !== "string") return undefined;
  const key = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (TYPE_ALIASES[key]) return TYPE_ALIASES[key];
  const byLabel = TRAP_EQUIPMENT_TYPES.find(
    (entry) => entry.label.toLowerCase() === value.trim().toLowerCase()
  );
  return byLabel?.value;
}

function parseLabelFromText(text: string): string | undefined {
  const trapMatch = text.match(/trap\s*#?\s*(\d+)/i);
  if (trapMatch) return `Trap #${trapMatch[1]}`;
  const hashMatch = text.match(/#\s*(\d+)/);
  if (hashMatch) return `Trap #${hashMatch[1]}`;
  return undefined;
}

function parseTnvrColonFormat(raw: string): ParsedEquipmentQr | null {
  // TNVR:gravity_trap:Trap #3:optional description
  if (!raw.toUpperCase().startsWith("TNVR:")) return null;
  const parts = raw.split(":");
  if (parts.length < 2) return null;

  const equipmentType = normalizeEquipmentType(parts[1]);
  const label = parts[2]?.trim() || parseLabelFromText(raw);
  const description = parts.slice(3).join(":").trim() || undefined;

  return {
    equipment_type: equipmentType,
    equipment_label: label,
    is_labeled: Boolean(label),
    description,
    qr_code_data: raw,
  };
}

function parseJsonPayload(raw: string): ParsedEquipmentQr | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const label =
      (typeof data.label === "string" ? data.label : undefined) ??
      (typeof data.equipment_label === "string" ? data.equipment_label : undefined) ??
      parseLabelFromText(raw);

    const equipmentType =
      normalizeEquipmentType(data.type) ??
      normalizeEquipmentType(data.equipment_type) ??
      normalizeEquipmentType(data.equipmentType);

    return {
      equipment_type: equipmentType,
      equipment_label: label,
      is_labeled: Boolean(label) || data.is_labeled === true,
      description:
        typeof data.description === "string"
          ? data.description
          : typeof data.model === "string"
            ? data.model
            : undefined,
      location: typeof data.location === "string" ? data.location : undefined,
      notes: typeof data.notes === "string" ? data.notes : undefined,
      qr_code_data: raw,
    };
  } catch {
    return null;
  }
}

function parseUrlPayload(raw: string): ParsedEquipmentQr | null {
  try {
    const url = new URL(raw);
    const params = url.searchParams;
    const label =
      params.get("label") ??
      params.get("equipment_label") ??
      parseLabelFromText(raw) ??
      undefined;
    const equipmentType =
      normalizeEquipmentType(params.get("type") ?? params.get("equipment_type") ?? "") ??
      undefined;

    if (!label && !equipmentType && !params.get("description")) return null;

    return {
      equipment_type: equipmentType,
      equipment_label: label,
      is_labeled: Boolean(label),
      description: params.get("description") ?? undefined,
      location: params.get("location") ?? undefined,
      notes: params.get("notes") ?? undefined,
      qr_code_data: raw,
    };
  } catch {
    return null;
  }
}

/** Parse scanned QR/barcode text into equipment form fields. */
export function parseEquipmentQrPayload(raw: string): ParsedEquipmentQr {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { qr_code_data: raw };
  }

  const json = parseJsonPayload(trimmed);
  if (json) return json;

  const url = parseUrlPayload(trimmed);
  if (url) return url;

  const tnvr = parseTnvrColonFormat(trimmed);
  if (tnvr) return tnvr;

  const label = parseLabelFromText(trimmed);
  const equipmentType = normalizeEquipmentType(trimmed);

  return {
    equipment_type: equipmentType,
    equipment_label: label ?? (equipmentType ? undefined : trimmed),
    is_labeled: Boolean(label ?? (!equipmentType && trimmed.length <= 40)),
    description: equipmentType ? trimmed : undefined,
    qr_code_data: raw,
  };
}
