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
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base leading-relaxed whitespace-pre-wrap">{displayValue(value)}</p>
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
    <section className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight border-b pb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">{children}</div>
    </section>
  );
}

export function formatYesNo(value: boolean | null | undefined) {
  if (value === null || value === undefined) return null;
  return value ? "Yes" : "No";
}

export function formatAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ") || null;
}
