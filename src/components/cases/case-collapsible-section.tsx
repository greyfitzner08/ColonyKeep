"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CaseCollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CaseCollapsibleSection({
  title,
  children,
  defaultOpen = true,
  className,
}: CaseCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between p-0 hover:bg-transparent"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <CardTitle className="text-lg text-left">{title}</CardTitle>
          <ChevronDown
            className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </Button>
      </CardHeader>
      {open && <CardContent className="pt-4">{children}</CardContent>}
    </Card>
  );
}
