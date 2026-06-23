export function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      field += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function recordsToObjects(
  records: string[][],
  headerRowIndex: number
): Record<string, string>[] {
  const headers = records[headerRowIndex] ?? [];
  return records
    .slice(headerRowIndex + 1)
    .filter((record) => record.some((cell) => cell.trim().length > 0))
    .map((record) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (!header.trim()) return;
        row[header] = record[index]?.trim() ?? "";
      });
      return row;
    });
}

export function parseCsv(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  const records = parseCsvRecords(cleaned);
  if (records.length < 2) return [];

  const headerRowIndex = 0;
  return recordsToObjects(records, headerRowIndex);
}
