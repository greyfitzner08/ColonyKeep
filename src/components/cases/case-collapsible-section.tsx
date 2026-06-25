"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CaseCollapsibleSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CaseCollapsibleSection({
  title,
  description,
  children,
  defaultOpen = true,
  className,
}: CaseCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 rounded-md text-left transition-colors hover:bg-muted/40 -mx-1 px-1 py-1"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <ChevronDown
            className={cn(
              "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </CardHeader>
      {open && <CardContent className="pt-4">{children}</CardContent>}
    </Card>
  );
}
