interface DetailFieldProps {
  label: string;
  value?: string | number | null;
}

export function DetailField({ label, value }: DetailFieldProps) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
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
