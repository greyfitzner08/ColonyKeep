"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModalSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function CollapsibleModalCard({
  title,
  summary,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-md border bg-muted/15", open && "bg-muted/10")}>
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        {!open && summary ? (
          <span className="max-w-[55%] shrink-0 truncate text-xs text-muted-foreground">
            {summary}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="space-y-3 border-t px-3 py-4">
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}
