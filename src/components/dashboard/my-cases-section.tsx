"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/cases/case-card";
import type { HelpRequest } from "@/lib/types";
import { Inbox } from "lucide-react";

interface MyCasesSectionProps {
  title: string;
  description: string;
  cases: HelpRequest[];
  emptyMessage: string;
  showClaimHint?: boolean;
  hintHref?: string;
  hintLabel?: string;
}

export function MyCasesSection({
  title,
  description,
  cases,
  emptyMessage,
  showClaimHint = false,
  hintHref = "/intake",
  hintLabel = "Go to intake queue",
}: MyCasesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {cases.length === 0 ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{emptyMessage}</p>
            {showClaimHint && (
              <Button asChild variant="outline" size="sm">
                <Link href={hintHref}>{hintLabel}</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((helpRequest) => (
              <CaseCard key={helpRequest.id} helpRequest={helpRequest} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
