"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getProfilePermissions } from "@/lib/permissions";
import {
  tutorialStepsForPermissions,
  type PlatformTutorialStep,
} from "@/lib/platform-tutorial/steps";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

interface PlatformTutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  userName?: string | null;
  /** When true, closing the dialog marks the tutorial complete (first sign-in flow). */
  markCompleteOnClose?: boolean;
  onCompleted?: () => void;
}

export function PlatformTutorialModal({
  open,
  onOpenChange,
  profile,
  userName,
  markCompleteOnClose = false,
  onCompleted,
}: PlatformTutorialModalProps) {
  const permissions = useMemo(() => getProfilePermissions(profile), [profile]);
  const steps = useMemo(() => tutorialStepsForPermissions(permissions), [permissions]);
  const [stepIndex, setStepIndex] = useState(0);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  async function persistCompletion() {
    if (!markCompleteOnClose) return;

    setCompleting(true);
    try {
      const response = await fetch("/api/profile/complete-tutorial", { method: "POST" });
      if (!response.ok) return;
      onCompleted?.();
    } finally {
      setCompleting(false);
    }
  }

  async function handleFinish() {
    await persistCompletion();
    onOpenChange(false);
  }

  async function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && markCompleteOnClose && open) {
      await persistCompletion();
    }
    onOpenChange(nextOpen);
  }

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <div className="border-b bg-muted/30 px-6 py-5">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <step.icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Platform walkthrough · Step {stepIndex + 1} of {steps.length}
                </p>
                <DialogTitle className="text-xl leading-tight">{step.title}</DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-sm leading-relaxed text-foreground/80">
              {step.id === "welcome" && userName ? (
                <>
                  Hi {userName}! {step.description}
                </>
              ) : (
                step.description
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <StepIndicators steps={steps} activeIndex={stepIndex} />

        <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            disabled={completing}
            onClick={() => void handleFinish()}
          >
            {markCompleteOnClose ? "Skip tour" : "Close"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isFirst || completing}
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {isLast ? (
              <Button type="button" disabled={completing} onClick={() => void handleFinish()}>
                {completing ? "Saving…" : "Get started"}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={completing}
                onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicators({
  steps,
  activeIndex,
}: {
  steps: PlatformTutorialStep[];
  activeIndex: number;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 px-6 py-4" aria-hidden>
      {steps.map((entry, index) => (
        <span
          key={entry.id}
          className={cn(
            "h-1.5 rounded-full transition-all",
            index === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}
