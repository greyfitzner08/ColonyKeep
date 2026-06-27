"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseQueueView } from "@/components/cases/case-queue-view";
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
  canClaim?: boolean;
  userEmail?: string;
  isAdmin?: boolean;
}

export function MyCasesSection({
  title,
  description,
  cases,
  emptyMessage,
  showClaimHint = false,
  hintHref = "/intake",
  hintLabel = "Go to inquiry queue",
  canClaim = false,
  userEmail = "",
  isAdmin = false,
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
          <CaseQueueView
            cases={cases}
            canClaim={canClaim}
            userEmail={userEmail}
            isAdmin={isAdmin}
            showControls
          />
        )}
      </CardContent>
    </Card>
  );
}
