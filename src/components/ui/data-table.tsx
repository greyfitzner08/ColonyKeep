"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { useColumnLayout } from "@/hooks/use-column-layout";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  label: ReactNode;
  header?: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  tableId: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  getRowClassName?: (row: T) => string | undefined;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
  minTableWidth?: number;
}

export function DataTable<T>({
  tableId,
  columns,
  rows,
  getRowKey,
  getRowClassName,
  emptyMessage = "No rows to display.",
  className,
  tableClassName,
  minTableWidth,
}: DataTableProps<T>) {
  const columnDefinitions = columns.map((column) => ({
    id: column.id,
    defaultWidth: column.defaultWidth,
    minWidth: column.minWidth,
  }));

  const { orderedColumnIds, columnWidths, setColumnWidth, moveColumn } = useColumnLayout(
    tableId,
    columnDefinitions
  );

  const columnById = new Map(columns.map((column) => [column.id, column]));
  const orderedColumns = orderedColumnIds
    .map((id) => columnById.get(id))
    .filter((column): column is DataTableColumn<T> => Boolean(column));

  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dropTargetColumnId, setDropTargetColumnId] = useState<string | null>(null);
  const resizingRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const startResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, columnId: string) => {
      event.preventDefault();
      event.stopPropagation();

      resizingRef.current = {
        columnId,
        startX: event.clientX,
        startWidth: columnWidths[columnId] ?? 160,
      };

      const handleMove = (moveEvent: MouseEvent) => {
        const state = resizingRef.current;
        if (!state) return;
        const delta = moveEvent.clientX - state.startX;
        setColumnWidth(state.columnId, state.startWidth + delta);
      };

      const handleUp = () => {
        resizingRef.current = null;
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [columnWidths, setColumnWidth]
  );

  if (rows.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border", className)}>
      <table
        className={cn("w-full text-sm", tableClassName)}
        style={{
          tableLayout: "fixed",
          minWidth: minTableWidth ?? orderedColumns.reduce((sum, column) => sum + (columnWidths[column.id] ?? 160), 0),
        }}
      >
        <colgroup>
          {orderedColumns.map((column) => (
            <col key={column.id} style={{ width: columnWidths[column.id] }} />
          ))}
        </colgroup>
        <thead className="bg-muted/50 text-left">
          <tr>
            {orderedColumns.map((column) => {
              const isDropTarget = dropTargetColumnId === column.id && draggingColumnId !== column.id;
              return (
                <th
                  key={column.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggingColumnId && draggingColumnId !== column.id) {
                      setDropTargetColumnId(column.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dropTargetColumnId === column.id) {
                      setDropTargetColumnId(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId = draggingColumnId ?? event.dataTransfer.getData("text/plain");
                    if (sourceId && sourceId !== column.id) {
                      moveColumn(sourceId, column.id);
                    }
                    setDraggingColumnId(null);
                    setDropTargetColumnId(null);
                  }}
                  className={cn(
                    "relative px-3 py-3 font-medium align-middle",
                    draggingColumnId === column.id && "opacity-50",
                    isDropTarget && "bg-primary/10 ring-1 ring-inset ring-primary/30",
                    column.headerClassName
                  )}
                >
                  <div className="flex min-w-0 items-center gap-1 pr-3">
                    <span
                      draggable
                      onDragStart={(event) => {
                        setDraggingColumnId(column.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", column.id);
                      }}
                      onDragEnd={() => {
                        setDraggingColumnId(null);
                        setDropTargetColumnId(null);
                      }}
                      className="inline-flex shrink-0 cursor-grab active:cursor-grabbing"
                      aria-hidden
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </span>
                    <div className="min-w-0 flex-1 truncate">
                      {column.header ?? column.label}
                    </div>
                  </div>
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${String(column.label)} column`}
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none hover:bg-primary/25"
                    onMouseDown={(event) => startResize(event, column.id)}
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className={cn("border-t align-top hover:bg-muted/30", getRowClassName?.(row))}
            >
              {orderedColumns.map((column) => (
                <td key={column.id} className={cn("px-3 py-3", column.cellClassName)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
