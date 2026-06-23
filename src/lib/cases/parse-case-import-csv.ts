import { findImportHeaderRowIndex } from "@/lib/cases/import-mapper";
import { parseCsvRecords, recordsToObjects } from "@/lib/csv";

export function parseCaseImportCsv(text: string): {
  rows: Record<string, string>[];
  headerRowIndex: number;
} {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  const records = parseCsvRecords(cleaned);
  if (records.length < 2) {
    return { rows: [], headerRowIndex: 0 };
  }

  const headerRowIndex = findImportHeaderRowIndex(records);
  const rows = recordsToObjects(records, headerRowIndex);
  return { rows, headerRowIndex };
}
