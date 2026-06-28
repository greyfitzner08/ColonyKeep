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
  headerAction?: ReactNode;
}

export function CaseCollapsibleSection({
  title,
  description,
  children,
  defaultOpen = true,
  className,
  headerAction,
}: CaseCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <div
          className={cn(
            "flex gap-3",
            description ? "items-start" : "items-center"
          )}
        >
          <button
            type="button"
            className={cn(
              "flex min-w-0 flex-1 gap-3 rounded-md text-left transition-colors hover:bg-muted/40",
              description ? "items-start py-1" : "items-center min-h-10"
            )}
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg leading-snug">{title}</CardTitle>
              {description && <CardDescription className="mt-1">{description}</CardDescription>}
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                description ? "mt-0.5" : "",
                open && "rotate-180"
              )}
            />
          </button>
          {headerAction ? <div className="shrink-0 pt-0.5">{headerAction}</div> : null}
        </div>
      </CardHeader>
      {open && <CardContent className="pt-4">{children}</CardContent>}
    </Card>
  );
}
