import type { TrapEquipmentStatus, TrapEquipmentType } from "@/lib/types";

export const TRAP_EQUIPMENT_TYPES: { value: TrapEquipmentType; label: string }[] = [
  { value: "gravity_trap", label: "Gravity Trap" },
  { value: "drop_trap", label: "Drop Trap" },
  { value: "transfer_trap", label: "Transfer Trap" },
  { value: "microchip_scanner", label: "Microchip Scanner" },
  { value: "trap_divider", label: "Trap Divider" },
  { value: "other", label: "Other" },
];

export const TRAP_EQUIPMENT_STATUSES: { value: TrapEquipmentStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "loaned", label: "Loaned Out" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
];

export const EQUIPMENT_STATUS_COLORS: Record<TrapEquipmentStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-200",
  loaned: "bg-amber-100 text-amber-900 border-amber-200",
  maintenance: "bg-orange-100 text-orange-900 border-orange-200",
  retired: "bg-gray-100 text-gray-700 border-gray-200",
};

export function equipmentTypeLabel(type: TrapEquipmentType): string {
  return TRAP_EQUIPMENT_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

export function equipmentStatusLabel(status: TrapEquipmentStatus): string {
  return TRAP_EQUIPMENT_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}
