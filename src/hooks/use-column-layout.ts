"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadColumnLayout,
  minColumnWidth,
  reorderColumns,
  saveColumnLayout,
  type ColumnLayoutDefinition,
  type ColumnLayoutState,
} from "@/lib/data-table/column-layout";

function mergeLayoutWithDefinitions(
  layout: ColumnLayoutState,
  definitions: ColumnLayoutDefinition[]
): ColumnLayoutState {
  const knownIds = new Set(definitions.map((definition) => definition.id));
  const order = [
    ...layout.order.filter((id) => knownIds.has(id)),
    ...definitions.map((definition) => definition.id).filter((id) => !layout.order.includes(id)),
  ];

  const widths = { ...layout.widths };
  for (const definition of definitions) {
    if (widths[definition.id] == null) {
      widths[definition.id] = definition.defaultWidth ?? 160;
    }
  }

  return { order, widths };
}

export function useColumnLayout(tableId: string, definitions: ColumnLayoutDefinition[]) {
  const definitionsRef = useRef(definitions);
  definitionsRef.current = definitions;

  const definitionKey = useMemo(
    () => definitions.map((definition) => `${definition.id}:${definition.defaultWidth ?? ""}`).join("|"),
    [definitions]
  );

  const [layout, setLayout] = useState<ColumnLayoutState>(() =>
    loadColumnLayout(tableId, definitions)
  );

  useEffect(() => {
    setLayout(loadColumnLayout(tableId, definitionsRef.current));
  }, [tableId, definitionKey]);

  useEffect(() => {
    saveColumnLayout(tableId, layout);
  }, [tableId, layout]);

  const definitionById = useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions]
  );

  const orderedColumnIds = useMemo(() => {
    return mergeLayoutWithDefinitions(layout, definitions).order;
  }, [definitions, layout]);

  const columnWidths = layout.widths;

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => {
      const definition = definitionById.get(columnId);
      if (!definition) return;
      const minimum = minColumnWidth(definition);
      setLayout((current) => ({
        ...current,
        widths: {
          ...current.widths,
          [columnId]: Math.max(minimum, Math.round(width)),
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
    columnWidths,
    setColumnWidth,
    moveColumn,
  };
}
