"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useColumnLayout } from "@/hooks/use-column-layout";
import { buildDataTableSearchText, compareSortValues, type SortDirection } from "@/lib/sort-values";
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
  /** When provided, the column header becomes sortable (A-Z / min-max). */
  sortValue?: (row: T) => string | number | null | undefined;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  tableId: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  getRowClassName?: (row: T) => string | undefined;
  emptyMessage?: string;
  noSearchMatchMessage?: string;
  className?: string;
  tableClassName?: string;
  minTableWidth?: number;
  /** When true, cell content is clipped to column width. Default false shows full content with wrapping. */
  clipCellContent?: boolean;
  /** `content` sizes columns to fit cell data; `fixed` uses resizable pixel widths. */
  columnSizing?: "fixed" | "content";
  /** Initial sort applied when the table mounts. */
  defaultSort?: { columnId: string; direction: SortDirection };
  /** Show a search field above the table. Defaults to true. */
  enableSearch?: boolean;
  searchPlaceholder?: string;
  /** Custom searchable text. Defaults to values from column sortValue functions. */
  getSearchText?: (row: T) => string;
}

export function DataTable<T>({
  tableId,
  columns,
  rows,
  getRowKey,
  getRowClassName,
  emptyMessage = "No rows to display.",
  noSearchMatchMessage = "No rows match your search.",
  className,
  tableClassName,
  minTableWidth,
  clipCellContent = false,
  columnSizing = "content",
  defaultSort,
  enableSearch = true,
  searchPlaceholder = "Search table…",
  getSearchText,
}: DataTableProps<T>) {
  const isFixedSizing = columnSizing === "fixed";
  const [sort, setSort] = useState<{ columnId: string; direction: SortDirection } | null>(
    defaultSort ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");

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

  const resolveSearchText = useCallback(
    (row: T) => {
      if (getSearchText) return getSearchText(row);
      return buildDataTableSearchText(row, columns);
    },
    [columns, getSearchText]
  );

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!enableSearch || !query) return rows;
    return rows.filter((row) => resolveSearchText(row).toLowerCase().includes(query));
  }, [enableSearch, rows, searchQuery, resolveSearchText]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;

    const column = columnById.get(sort.columnId);
    if (!column?.sortValue) return filteredRows;

    const getValue = column.sortValue;
    return [...filteredRows].sort((left, right) =>
      compareSortValues(getValue(left), getValue(right), sort.direction)
    );
  }, [filteredRows, sort, columnById]);

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

  const toggleSort = useCallback((columnId: string) => {
    setSort((current) => {
      if (current?.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { columnId, direction: "desc" };
      }
      return null;
    });
  }, []);

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

  function renderHeaderLabel(column: DataTableColumn<T>) {
    if (column.header) return column.header;
    if (!column.sortValue) return column.label;

    const isActive = sort?.columnId === column.id;
    const direction = isActive ? sort.direction : null;

    return (
      <button
        type="button"
        className="inline-flex min-w-0 items-center gap-1 text-left transition-colors hover:text-foreground"
        onClick={() => toggleSort(column.id)}
      >
        <span className="truncate">{column.label}</span>
        {direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5 shrink-0" />
        ) : direction === "desc" ? (
          <ArrowDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        )}
      </button>
    );
  }

  if (rows.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{emptyMessage}</p>;
  }

  const searchActive = enableSearch && searchQuery.trim().length > 0;
  const showingCount = sortedRows.length;
  const totalCount = rows.length;

  return (
    <div className="space-y-3">
      {enableSearch && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label={searchPlaceholder}
            />
          </div>
          {searchActive && (
            <p className="text-sm text-muted-foreground">
              Showing {showingCount} of {totalCount}
            </p>
          )}
        </div>
      )}

      {sortedRows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{noSearchMatchMessage}</p>
      ) : (
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
                  const isDropTarget =
                    dropTargetColumnId === column.id && draggingColumnId !== column.id;
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
                          {renderHeaderLabel(column)}
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
              {sortedRows.map((row) => (
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
      )}
    </div>
  );
}
