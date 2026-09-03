"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, GripVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useColumnLayout } from "@/hooks/use-column-layout";
import { buildDataTableSearchText, compareSortValues, type SortDirection } from "@/lib/sort-values";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  label: ReactNode;
  /** Plain-text label for the Columns menu when `label` is not a string. */
  labelText?: string;
  header?: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  headerClassName?: string;
  cellClassName?: string;
  /** Allow cell text to wrap. */
  wrap?: boolean;
  /** When false, the column cannot be hidden. Defaults to true. */
  hideable?: boolean;
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
  /** When true with fixed sizing, force max-w-0 clipping on cells. Fixed tables always contain overflow. */
  clipCellContent?: boolean;
  /**
   * `fixed` (default) uses resizable pixel widths — drag header edges to resize.
   * `content` sizes columns to fit cell data without resize handles.
   */
  columnSizing?: "fixed" | "content";
  /** Initial sort applied when the table mounts. */
  defaultSort?: { columnId: string; direction: SortDirection };
  /** Show a search field above the table. Defaults to true. */
  enableSearch?: boolean;
  /** Show a Columns menu to hide/show columns. Defaults to true. */
  enableColumnVisibility?: boolean;
  searchPlaceholder?: string;
  /** Custom searchable text. Defaults to values from column sortValue functions. */
  getSearchText?: (row: T) => string;
}

function columnMenuLabel<T>(column: DataTableColumn<T>): string {
  if (column.labelText) return column.labelText;
  if (typeof column.label === "string") return column.label;
  return column.id
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
  columnSizing = "fixed",
  defaultSort,
  enableSearch = true,
  enableColumnVisibility = true,
  searchPlaceholder = "Search table…",
  getSearchText,
}: DataTableProps<T>) {
  const isFixedSizing = columnSizing === "fixed";
  const [sort, setSort] = useState<{ columnId: string; direction: SortDirection } | null>(
    defaultSort ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const columnDefinitions = useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        defaultWidth: column.defaultWidth,
        minWidth: column.minWidth,
      })),
    [columns]
  );

  const {
    orderedColumnIds,
    columnWidths,
    hiddenColumnIds,
    setColumnWidth,
    moveColumn,
    setColumnHidden,
    showAllColumns,
  } = useColumnLayout(tableId, columnDefinitions);

  const hiddenSet = useMemo(() => new Set(hiddenColumnIds), [hiddenColumnIds]);

  const columnById = useMemo(() => new Map(columns.map((column) => [column.id, column])), [columns]);
  const orderedColumns = orderedColumnIds
    .map((id) => columnById.get(id))
    .filter((column): column is DataTableColumn<T> => Boolean(column))
    .filter((column) => !hiddenSet.has(column.id));

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
  const [scrollContainerEl, setScrollContainerEl] = useState<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const draggingColumnIdRef = useRef<string | null>(null);
  const resizingRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    if (!scrollContainerEl) {
      setContainerWidth(0);
      return;
    }

    const updateWidth = () => {
      setContainerWidth(scrollContainerEl.clientWidth);
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(scrollContainerEl);
    return () => observer.disconnect();
  }, [scrollContainerEl]);

  useEffect(() => {
    if (!columnsMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!columnsMenuRef.current?.contains(event.target as Node)) {
        setColumnsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setColumnsMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [columnsMenuOpen]);

  const resolvedColumnWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    for (const column of orderedColumns) {
      widths[column.id] = columnWidths[column.id] ?? column.defaultWidth ?? 160;
    }

    if (!isFixedSizing || orderedColumns.length === 0) return widths;

    const lastColumn = orderedColumns[orderedColumns.length - 1];
    if (!lastColumn) return widths;

    const otherColumnsWidth = orderedColumns
      .slice(0, -1)
      .reduce((sum, column) => sum + (widths[column.id] ?? 160), 0);
    const lastMinWidth = widths[lastColumn.id] ?? lastColumn.defaultWidth ?? 160;

    // Stretch the last column so the table fills the container (no empty white strip).
    if (containerWidth > 0) {
      widths[lastColumn.id] = Math.max(lastMinWidth, containerWidth - otherColumnsWidth);
    }

    return widths;
  }, [columnWidths, containerWidth, isFixedSizing, orderedColumns]);

  const totalTableWidth = useMemo(() => {
    if (!isFixedSizing) return minTableWidth ?? 0;
    const calculated = orderedColumns.reduce(
      (sum, column) => sum + (resolvedColumnWidths[column.id] ?? column.defaultWidth ?? 160),
      0
    );
    return Math.max(minTableWidth ?? 0, containerWidth, calculated);
  }, [containerWidth, isFixedSizing, minTableWidth, orderedColumns, resolvedColumnWidths]);

  const lastColumnId = orderedColumns[orderedColumns.length - 1]?.id ?? null;

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

  const searchActive = enableSearch && searchQuery.trim().length > 0;
  const showingCount = sortedRows.length;
  const totalCount = rows.length;
  const showToolbar = enableSearch || enableColumnVisibility;

  if (rows.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {showToolbar && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {enableSearch && (
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
            )}
            {enableColumnVisibility && (
              <div className="relative" ref={columnsMenuRef}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setColumnsMenuOpen((open) => !open)}
                  aria-expanded={columnsMenuOpen}
                  aria-haspopup="menu"
                >
                  <Columns3 className="h-4 w-4" />
                  Columns
                </Button>
                {columnsMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 z-20 mt-2 w-56 rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Show columns
                      </p>
                      {hiddenColumnIds.length > 0 && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={showAllColumns}
                        >
                          Show all
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {orderedColumnIds.map((columnId) => {
                        const column = columnById.get(columnId);
                        if (!column) return null;
                        const hideable = column.hideable !== false;
                        const checked = !hiddenSet.has(column.id);
                        const onlyVisible =
                          checked && orderedColumns.length === 1;
                        return (
                          <div key={column.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`${tableId}-col-${column.id}`}
                              checked={checked}
                              disabled={!hideable || onlyVisible}
                              onCheckedChange={(value) =>
                                setColumnHidden(column.id, value !== true)
                              }
                            />
                            <Label
                              htmlFor={`${tableId}-col-${column.id}`}
                              className="font-normal"
                            >
                              {columnMenuLabel(column)}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Drag header edges to resize. The last column fills leftover space. Drag the
                      grip to reorder.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          {searchActive && (
            <p className="text-sm text-muted-foreground">
              Showing {showingCount} of {totalCount}
            </p>
          )}
        </div>
      )}

      {orderedColumns.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          All columns are hidden. Use Columns to show some again.
        </p>
      ) : sortedRows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{noSearchMatchMessage}</p>
      ) : (
        <div
          ref={setScrollContainerEl}
          className={cn("overflow-x-auto rounded-lg border", className)}
        >
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
                    style={{ width: resolvedColumnWidths[column.id] ?? column.defaultWidth ?? 160 }}
                  />
                ))}
              </colgroup>
            )}
            <thead className="bg-muted/50 text-left">
              <tr>
                {orderedColumns.map((column) => {
                  const isDropTarget =
                    dropTargetColumnId === column.id && draggingColumnId !== column.id;
                  const isLastColumn = column.id === lastColumnId;
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
                        isFixedSizing && "overflow-hidden",
                        !isFixedSizing && "whitespace-nowrap",
                        clipCellContent && isFixedSizing && "max-w-0",
                        draggingColumnId === column.id && "opacity-50",
                        isDropTarget && "bg-primary/10 ring-1 ring-inset ring-primary/30",
                        column.headerClassName
                      )}
                    >
                      <div
                        className={cn(
                          "flex min-w-0 max-w-full items-center gap-1",
                          isFixedSizing && !isLastColumn ? "pr-3" : "pr-0"
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
                            "min-w-0 flex-1 overflow-hidden",
                            isFixedSizing || clipCellContent ? "truncate" : "whitespace-normal"
                          )}
                        >
                          {renderHeaderLabel(column)}
                        </div>
                      </div>
                      {isFixedSizing && !isLastColumn && (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Resize ${columnMenuLabel(column)} column`}
                          title="Drag to resize"
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
                        isFixedSizing && "overflow-hidden",
                        !isFixedSizing && !column.wrap && "whitespace-nowrap",
                        clipCellContent && isFixedSizing && "max-w-0",
                        column.cellClassName
                      )}
                    >
                      <div
                        className={cn(
                          "min-w-0 max-w-full",
                          isFixedSizing
                            ? column.wrap
                              ? "overflow-hidden whitespace-normal break-words"
                              : "truncate"
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
