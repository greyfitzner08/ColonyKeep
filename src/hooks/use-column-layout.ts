"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadColumnLayout,
  minColumnWidth,
  reorderColumns,
  saveColumnLayout,
  type ColumnLayoutDefinition,
  type ColumnLayoutState,
} from "@/lib/data-table/column-layout";

export function useColumnLayout(tableId: string, definitions: ColumnLayoutDefinition[]) {
  const definitionKey = useMemo(
    () => definitions.map((definition) => `${definition.id}:${definition.defaultWidth ?? ""}`).join("|"),
    [definitions]
  );

  const [layout, setLayout] = useState<ColumnLayoutState>(() =>
    loadColumnLayout(tableId, definitions)
  );

  useEffect(() => {
    setLayout(loadColumnLayout(tableId, definitions));
  }, [tableId, definitionKey, definitions]);

  useEffect(() => {
    saveColumnLayout(tableId, layout);
  }, [tableId, layout]);

  const definitionById = useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions]
  );

  const orderedColumnIds = useMemo(() => {
    const known = new Set(definitions.map((definition) => definition.id));
    const next = layout.order.filter((id) => known.has(id));
    for (const definition of definitions) {
      if (!next.includes(definition.id)) next.push(definition.id);
    }
    return next;
  }, [definitions, layout.order]);

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => {
      const definition = definitionById.get(columnId);
      if (!definition) return;
      const minWidth = minColumnWidth(definition);
      setLayout((current) => ({
        ...current,
        widths: {
          ...current.widths,
          [columnId]: Math.max(minWidth, Math.round(width)),
        },
      }));
    },
    [definitionById]
  );

  const moveColumn = useCallback((sourceId: string, targetId: string) => {
    setLayout((current) => ({
      ...current,
      order: reorderColumns(current.order, sourceId, targetId),
    }));
  }, []);

  return {
    orderedColumnIds,
    columnWidths: layout.widths,
    setColumnWidth,
    moveColumn,
  };
}
