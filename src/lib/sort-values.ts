export type SortDirection = "asc" | "desc";

export function compareSortValues(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
  direction: SortDirection
): number {
  const leftMissing = left == null || left === "";
  const rightMissing = right == null || right === "";

  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;

  let result = 0;
  if (typeof left === "number" && typeof right === "number") {
    result = left - right;
  } else {
    result = String(left).localeCompare(String(right), undefined, {
      sensitivity: "base",
      numeric: true,
    });
  }

  return direction === "asc" ? result : -result;
}

export function buildDataTableSearchText<T>(
  row: T,
  columns: Array<{ sortValue?: (row: T) => string | number | null | undefined }>
): string {
  return columns
    .map((column) => column.sortValue?.(row))
    .filter((value) => value != null && String(value).trim() !== "")
    .join(" ");
}
