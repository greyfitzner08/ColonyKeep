import type { ReactNode } from "react";

interface DetailFieldProps {
  label: string;
  value?: string | number | boolean | null;
  alwaysShow?: boolean;
}

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function DetailField({ label, value, alwaysShow }: DetailFieldProps) {
  if (!alwaysShow && (value === null || value === undefined || value === "")) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{displayValue(value)}</p>
    </div>
  );
}

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">{children}</div>
    </div>
  );
}

export function formatYesNo(value: boolean | null | undefined) {
  if (value === null || value === undefined) return null;
  return value ? "Yes" : "No";
}

export function formatAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ") || null;
}
