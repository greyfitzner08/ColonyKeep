import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";

interface InfoRowProps {
  label: string;
  value?: string | number | boolean | null;
  alwaysShow?: boolean;
}

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function InfoRow({ label, value, alwaysShow }: InfoRowProps) {
  if (!alwaysShow && (value === null || value === undefined || value === "")) return null;

  return (
    <div className="grid grid-cols-1 gap-1 py-3 border-b border-border/50 last:border-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-base leading-relaxed whitespace-pre-wrap">{displayValue(value)}</dd>
    </div>
  );
}

export function InfoCard({
  title,
  children,
  defaultOpen = true,
  collapsible = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  if (collapsible) {
    return (
      <CaseCollapsibleSection title={title} defaultOpen={defaultOpen}>
        <dl>{children}</dl>
      </CaseCollapsibleSection>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <dl>{children}</dl>
      </CardContent>
    </Card>
  );
}

/** @deprecated Use InfoRow inside InfoCard for scannable layouts. */
export function DetailField({ label, value, alwaysShow }: InfoRowProps) {
  return <InfoRow label={label} value={value} alwaysShow={alwaysShow} />;
}

/** @deprecated Use InfoCard sections instead. */
export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="space-y-0">{children}</div>
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

export function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted px-4 py-3 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
