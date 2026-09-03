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

  const hidden = (layout.hidden ?? []).filter((id) => knownIds.has(id));
  if (hidden.length >= definitions.length && definitions.length > 0) {
    return {
      order,
      widths,
      hidden: hidden.filter((id) => id !== definitions[0].id),
    };
  }

  return { order, widths, hidden };
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

  const merged = useMemo(
    () => mergeLayoutWithDefinitions(layout, definitions),
    [definitions, layout]
  );

  const orderedColumnIds = merged.order;
  const columnWidths = merged.widths;
  const hiddenColumnIds = merged.hidden;

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

  const setColumnHidden = useCallback(
    (columnId: string, hidden: boolean) => {
      if (!definitionById.has(columnId)) return;

      setLayout((current) => {
        const nextHidden = new Set(current.hidden ?? []);
        if (hidden) nextHidden.add(columnId);
        else nextHidden.delete(columnId);

        const visibleCount = definitionsRef.current.filter(
          (definition) => !nextHidden.has(definition.id)
        ).length;
        if (visibleCount === 0) return current;

        return {
          ...current,
          hidden: [...nextHidden],
        };
      });
    },
    [definitionById]
  );

  const showAllColumns = useCallback(() => {
    setLayout((current) => ({
      ...current,
      hidden: [],
    }));
  }, []);

  return {
    orderedColumnIds,
    columnWidths,
    hiddenColumnIds,
    setColumnWidth,
    moveColumn,
    setColumnHidden,
    showAllColumns,
  };
}
