"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
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
  /** Allow cell text to wrap when using content-based column sizing. */
  wrap?: boolean;
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
  /** When true, cell content is clipped to column width. Default false shows full content with wrapping. */
  clipCellContent?: boolean;
  /** `content` sizes columns to fit cell data; `fixed` uses resizable pixel widths. */
  columnSizing?: "fixed" | "content";
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
  clipCellContent = false,
  columnSizing = "content",
}: DataTableProps<T>) {
  const isFixedSizing = columnSizing === "fixed";
  const columnDefinitions = useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        defaultWidth: column.defaultWidth,
        minWidth: column.minWidth,
      })),
    [columns]
  );

  const { orderedColumnIds, columnWidths, setColumnWidth, moveColumn } = useColumnLayout(
    tableId,
    columnDefinitions
  );

  const columnById = useMemo(() => new Map(columns.map((column) => [column.id, column])), [columns]);
  const orderedColumns = orderedColumnIds
    .map((id) => columnById.get(id))
    .filter((column): column is DataTableColumn<T> => Boolean(column));

  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dropTargetColumnId, setDropTargetColumnId] = useState<string | null>(null);
  const draggingColumnIdRef = useRef<string | null>(null);
  const resizingRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const totalTableWidth = useMemo(() => {
    if (!isFixedSizing) return minTableWidth ?? 0;
    const calculated = orderedColumns.reduce(
      (sum, column) => sum + (columnWidths[column.id] ?? column.defaultWidth ?? 160),
      0
    );
    return Math.max(minTableWidth ?? 0, calculated);
  }, [columnWidths, isFixedSizing, minTableWidth, orderedColumns]);

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, columnId: string) => {
      event.preventDefault();
      event.stopPropagation();

      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);

      resizingRef.current = {
        columnId,
        startX: event.clientX,
        startWidth: columnWidths[columnId] ?? 160,
      };

      const handleMove = (moveEvent: PointerEvent) => {
        const state = resizingRef.current;
        if (!state) return;
        const delta = moveEvent.clientX - state.startX;
        setColumnWidth(state.columnId, state.startWidth + delta);
      };

      const handleUp = (upEvent: PointerEvent) => {
        resizingRef.current = null;
        target.releasePointerCapture(upEvent.pointerId);
        target.removeEventListener("pointermove", handleMove);
        target.removeEventListener("pointerup", handleUp);
        target.removeEventListener("pointercancel", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      target.addEventListener("pointermove", handleMove);
      target.addEventListener("pointerup", handleUp);
      target.addEventListener("pointercancel", handleUp);
    },
    [columnWidths, setColumnWidth]
  );

  if (rows.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border", className)}>
      <table
        className={cn("text-sm", isFixedSizing ? undefined : "w-full", tableClassName)}
        style={
          isFixedSizing
            ? {
                tableLayout: "fixed",
                width: totalTableWidth,
                minWidth: totalTableWidth,
              }
            : {
                tableLayout: "auto",
                width: "100%",
                minWidth: minTableWidth,
              }
        }
      >
        {isFixedSizing && (
          <colgroup>
            {orderedColumns.map((column) => (
              <col
                key={column.id}
                style={{ width: columnWidths[column.id] ?? column.defaultWidth ?? 160 }}
              />
            ))}
          </colgroup>
        )}
        <thead className="bg-muted/50 text-left">
          <tr>
            {orderedColumns.map((column) => {
              const isDropTarget = dropTargetColumnId === column.id && draggingColumnId !== column.id;
              return (
                <th
                  key={column.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (draggingColumnIdRef.current && draggingColumnIdRef.current !== column.id) {
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
                    const sourceId =
                      draggingColumnIdRef.current ?? event.dataTransfer.getData("text/plain");
                    if (sourceId && sourceId !== column.id) {
                      moveColumn(sourceId, column.id);
                    }
                    draggingColumnIdRef.current = null;
                    setDraggingColumnId(null);
                    setDropTargetColumnId(null);
                  }}
                  className={cn(
                    "relative px-3 py-3 font-medium align-middle",
                    !isFixedSizing && "whitespace-nowrap",
                    clipCellContent && isFixedSizing && "max-w-0 overflow-hidden",
                    draggingColumnId === column.id && "opacity-50",
                    isDropTarget && "bg-primary/10 ring-1 ring-inset ring-primary/30",
                    column.headerClassName
                  )}
                >
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-1",
                      isFixedSizing && clipCellContent ? "pr-4" : "pr-0"
                    )}
                  >
                    <span
                      draggable
                      onDragStart={(event) => {
                        draggingColumnIdRef.current = column.id;
                        setDraggingColumnId(column.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", column.id);
                      }}
                      onDragEnd={() => {
                        draggingColumnIdRef.current = null;
                        setDraggingColumnId(null);
                        setDropTargetColumnId(null);
                      }}
                      className="inline-flex shrink-0 cursor-grab touch-none active:cursor-grabbing"
                      title="Drag to reorder column"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </span>
                    <div
                      className={cn(
                        "min-w-0 flex-1",
                        clipCellContent && isFixedSizing ? "truncate" : "whitespace-normal"
                      )}
                    >
                      {column.header ?? column.label}
                    </div>
                  </div>
                  {isFixedSizing && (
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${String(column.label)} column`}
                      className="absolute right-0 top-0 z-10 h-full w-3 cursor-col-resize touch-none hover:bg-primary/30"
                      onPointerDown={(event) => startResize(event, column.id)}
                    />
                  )}
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
                <td
                  key={column.id}
                  className={cn(
                    "px-3 py-3 align-top",
                    !isFixedSizing && !column.wrap && "whitespace-nowrap",
                    clipCellContent && isFixedSizing && "max-w-0 overflow-hidden",
                    column.cellClassName
                  )}
                >
                  <div
                    className={cn(
                      "min-w-0",
                      clipCellContent && isFixedSizing
                        ? "overflow-hidden"
                        : column.wrap
                          ? "whitespace-normal break-words"
                          : "whitespace-nowrap"
                    )}
                  >
                    {column.render(row)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
