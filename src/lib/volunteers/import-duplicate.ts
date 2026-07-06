import { parseCsv } from "@/lib/csv";
import { mapVolunteerImportRow } from "@/lib/volunteers/import-mapper";
import type {
  VolunteerImportRoleMatcher,
  VolunteerImportRoleResolution,
} from "@/lib/volunteers/import-role-matcher";
import type { VolunteerImportColumnResolution } from "@/lib/volunteers/import-mapper";
import { mergeVolunteerRoles } from "@/lib/volunteers/role-expansion";
import type { VolunteerApplicationStatus, VolunteerRole } from "@/lib/types";

export type VolunteerImportRecord = {
  status: VolunteerApplicationStatus;
  full_name: string;
  email: string;
  phone: string;
  birthday: string | null;
  roles_requested: VolunteerRole[];
  why_volunteer: string;
  prior_experience: string | null;
  how_heard: string | null;
  liability_waiver_signed: boolean;
  policy_signed: boolean;
  tnvr_certificate_uploaded: boolean;
  admin_notes: string | null;
};

export type VolunteerImportDuplicateAction =
  | "skip"
  | "replace"
  | "merge_import"
  | "merge_keep_existing";

export type VolunteerImportExistingSummary = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  birthday: string | null;
  status: VolunteerApplicationStatus;
  roles_requested: VolunteerRole[];
  why_volunteer: string;
  prior_experience: string | null;
  how_heard: string | null;
  liability_waiver_signed: boolean;
  policy_signed: boolean;
  tnvr_certificate_uploaded: boolean;
  admin_notes: string | null;
};

export type VolunteerImportParsedRow = {
  row: number;
  error?: string;
  record?: VolunteerImportRecord;
};

export type VolunteerImportDuplicateGroup = {
  email: string;
  kind: "database" | "file" | "both";
  existing: VolunteerImportExistingSummary | null;
  importRows: Array<{ row: number; record: VolunteerImportRecord }>;
  suggestedAction: VolunteerImportDuplicateAction;
};

export type VolunteerImportPreview = {
  uniqueRows: VolunteerImportParsedRow[];
  duplicateGroups: VolunteerImportDuplicateGroup[];
  errors: Array<{ row: number; error: string }>;
};

const STATUS_RANK: Record<VolunteerApplicationStatus, number> = {
  approved: 4,
  pending: 3,
  needs_followup: 2,
  rejected: 1,
};

function pickText(
  preferImport: boolean,
  existing: string | null | undefined,
  incoming: string | null | undefined,
  fallback = ""
): string {
  const existingText = existing?.trim() ?? "";
  const incomingText = incoming?.trim() ?? "";
  if (preferImport) {
    return incomingText || existingText || fallback;
  }
  return existingText || incomingText || fallback;
}

function pickStatus(
  preferImport: boolean,
  existing: VolunteerApplicationStatus,
  incoming: VolunteerApplicationStatus
): VolunteerApplicationStatus {
  if (preferImport) {
    return STATUS_RANK[incoming] >= STATUS_RANK[existing] ? incoming : existing;
  }
  return STATUS_RANK[existing] >= STATUS_RANK[incoming] ? existing : incoming;
}

function combineNotes(
  preferImport: boolean,
  existing: string | null,
  incoming: string | null
): string | null {
  const existingText = existing?.trim() ?? "";
  const incomingText = incoming?.trim() ?? "";
  if (!existingText && !incomingText) return null;
  if (!existingText) return incomingText;
  if (!incomingText) return existingText;
  if (existingText === incomingText) return existingText;
  if (preferImport) {
    return `${incomingText}\n\n${existingText}`;
  }
  return `${existingText}\n\n${incomingText}`;
}

export function mergeVolunteerImportRecords(
  existing: VolunteerImportRecord | VolunteerImportExistingSummary,
  incoming: VolunteerImportRecord,
  preferImport: boolean
): VolunteerImportRecord {
  return {
    status: pickStatus(preferImport, existing.status, incoming.status),
    full_name: pickText(preferImport, existing.full_name, incoming.full_name),
    email: existing.email.toLowerCase(),
    phone: pickText(preferImport, existing.phone, incoming.phone),
    birthday: pickText(preferImport, existing.birthday, incoming.birthday),
    roles_requested: mergeVolunteerRoles(
      existing.roles_requested ?? [],
      incoming.roles_requested ?? []
    ),
    why_volunteer: pickText(
      preferImport,
      existing.why_volunteer,
      incoming.why_volunteer,
      "Imported volunteer application"
    ),
    prior_experience: pickText(
      preferImport,
      existing.prior_experience,
      incoming.prior_experience
    ) || null,
    how_heard: pickText(preferImport, existing.how_heard, incoming.how_heard) || null,
    liability_waiver_signed:
      existing.liability_waiver_signed || incoming.liability_waiver_signed,
    policy_signed: existing.policy_signed || incoming.policy_signed,
    tnvr_certificate_uploaded:
      existing.tnvr_certificate_uploaded || incoming.tnvr_certificate_uploaded,
    admin_notes: combineNotes(preferImport, existing.admin_notes, incoming.admin_notes),
  };
}

export function foldImportRows(
  rows: VolunteerImportRecord[],
  preferImport: boolean
): VolunteerImportRecord {
  return rows.slice(1).reduce(
    (accumulator, row) => mergeVolunteerImportRecords(accumulator, row, preferImport),
    rows[0]
  );
}

export function parseVolunteerImportCsv(
  csvText: string,
  roleMatcher?: VolunteerImportRoleMatcher,
  roleResolutions: Record<string, VolunteerImportRoleResolution> = {},
  columnResolutions: Record<string, VolunteerImportColumnResolution> = {}
): VolunteerImportParsedRow[] {
  const rows = parseCsv(csvText.replace(/^\uFEFF/, "").trim());
  return rows.map((raw, index) => {
    const mapped = mapVolunteerImportRow(
      raw,
      roleMatcher,
      roleResolutions,
      columnResolutions
    );
    if (mapped.error || !mapped.record) {
      return { row: index + 2, error: mapped.error ?? "Invalid row" };
    }
    return {
      row: index + 2,
      record: mapped.record as VolunteerImportRecord,
    };
  });
}

export function buildVolunteerImportPreview(
  parsedRows: VolunteerImportParsedRow[],
  existingByEmail: Map<string, VolunteerImportExistingSummary>
): VolunteerImportPreview {
  const errors = parsedRows
    .filter((entry) => entry.error)
    .map((entry) => ({ row: entry.row, error: entry.error! }));

  const validRows = parsedRows.filter(
    (entry): entry is VolunteerImportParsedRow & { record: VolunteerImportRecord } =>
      Boolean(entry.record)
  );

  const rowsByEmail = new Map<string, Array<{ row: number; record: VolunteerImportRecord }>>();
  for (const entry of validRows) {
    const email = entry.record.email.toLowerCase();
    const group = rowsByEmail.get(email) ?? [];
    group.push({ row: entry.row, record: entry.record });
    rowsByEmail.set(email, group);
  }

  const duplicateEmails = new Set<string>();
  for (const [email, group] of rowsByEmail.entries()) {
    if (group.length > 1 || existingByEmail.has(email)) {
      duplicateEmails.add(email);
    }
  }

  const duplicateGroups: VolunteerImportDuplicateGroup[] = Array.from(duplicateEmails)
    .sort()
    .map((email) => {
      const importRows = rowsByEmail.get(email) ?? [];
      const existing = existingByEmail.get(email) ?? null;
      const kind =
        existing && importRows.length > 0
          ? "both"
          : existing
            ? "database"
            : "file";

      return {
        email,
        kind,
        existing,
        importRows,
        suggestedAction:
          kind === "file" ? "merge_import" : ("skip" as VolunteerImportDuplicateAction),
      };
    });

  const uniqueRows = validRows.filter((entry) => !duplicateEmails.has(entry.record.email));

  return {
    uniqueRows,
    duplicateGroups,
    errors,
  };
}

export function resolveVolunteerImportGroup(
  group: VolunteerImportDuplicateGroup,
  action: VolunteerImportDuplicateAction
): { apply: boolean; record?: VolunteerImportRecord; existingId?: string } {
  const importRows = group.importRows.map((entry) => entry.record);
  if (importRows.length === 0) {
    return { apply: false };
  }

  if (action === "skip") {
    return { apply: false };
  }

  if (action === "replace") {
    const record = importRows[importRows.length - 1];
    return {
      apply: true,
      record,
      existingId: group.existing?.id,
    };
  }

  if (action === "merge_import") {
    const mergedImport = foldImportRows(importRows, true);
    if (!group.existing) {
      return { apply: true, record: mergedImport };
    }
    return {
      apply: true,
      record: mergeVolunteerImportRecords(group.existing, mergedImport, true),
      existingId: group.existing.id,
    };
  }

  const mergedImport = foldImportRows(importRows, false);
  if (!group.existing) {
    return { apply: true, record: mergedImport };
  }
  return {
    apply: true,
    record: mergeVolunteerImportRecords(group.existing, mergedImport, false),
    existingId: group.existing.id,
  };
}
