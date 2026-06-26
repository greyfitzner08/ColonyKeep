export interface ColumnLayoutState {
  order: string[];
  widths: Record<string, number>;
}

export interface ColumnLayoutDefinition {
  id: string;
  defaultWidth?: number;
  minWidth?: number;
}

const STORAGE_PREFIX = "tnvr-table-layout:";

const DEFAULT_WIDTH = 160;
const DEFAULT_MIN_WIDTH = 72;

export function defaultColumnWidth(definition: ColumnLayoutDefinition): number {
  return definition.defaultWidth ?? DEFAULT_WIDTH;
}

export function minColumnWidth(definition: ColumnLayoutDefinition): number {
  return definition.minWidth ?? DEFAULT_MIN_WIDTH;
}

export function loadColumnLayout(
  tableId: string,
  definitions: ColumnLayoutDefinition[]
): ColumnLayoutState {
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const defaultOrder = definitions.map((definition) => definition.id);
  const defaultWidths = Object.fromEntries(
    definitions.map((definition) => [definition.id, defaultColumnWidth(definition)])
  );

  if (typeof window === "undefined") {
    return { order: defaultOrder, widths: defaultWidths };
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${tableId}`);
    if (!raw) return { order: defaultOrder, widths: defaultWidths };

    const parsed = JSON.parse(raw) as Partial<ColumnLayoutState>;
    const savedOrder = Array.isArray(parsed.order) ? parsed.order.filter((id) => definitionById.has(id)) : [];
    const order = [
      ...savedOrder,
      ...defaultOrder.filter((id) => !savedOrder.includes(id)),
    ];

    const widths = { ...defaultWidths };
    if (parsed.widths && typeof parsed.widths === "object") {
      for (const [id, width] of Object.entries(parsed.widths)) {
        if (!definitionById.has(id) || typeof width !== "number") continue;
        const definition = definitionById.get(id)!;
        widths[id] = Math.max(minColumnWidth(definition), width);
      }
    }

    return { order, widths };
  } catch {
    return { order: defaultOrder, widths: defaultWidths };
  }
}

export function saveColumnLayout(tableId: string, layout: ColumnLayoutState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${tableId}`, JSON.stringify(layout));
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

export function reorderColumns(order: string[], sourceId: string, targetId: string): string[] {
  if (sourceId === targetId) return order;
  const next = order.filter((id) => id !== sourceId);
  const targetIndex = next.indexOf(targetId);
  if (targetIndex === -1) return order;
  next.splice(targetIndex, 0, sourceId);
  return next;
}
