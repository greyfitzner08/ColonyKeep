"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProfilePermissions } from "@/lib/permissions";
import {
  stepDescription,
  tutorialStepsForPermissions,
  type PlatformTutorialStep,
} from "@/lib/platform-tutorial/steps";
import { useTutorialNavigation } from "@/components/platform-tutorial/tutorial-navigation-context";
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
  const router = useRouter();
  const { setHighlightedNav, setTourActive } = useTutorialNavigation();
  const permissions = useMemo(() => getProfilePermissions(profile), [profile]);
  const steps = useMemo(() => tutorialStepsForPermissions(permissions), [permissions]);
  const [stepIndex, setStepIndex] = useState(0);
  const [completing, setCompleting] = useState(false);

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const description = step ? stepDescription(step, permissions) : "";

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  useEffect(() => {
    setTourActive(open);
    if (!open) {
      setHighlightedNav(null);
      return;
    }

    if (!step) {
      setHighlightedNav(null);
      return;
    }

    if (step.highlightSidebar) {
      setHighlightedNav("sidebar");
      return;
    }

    if (step.navHref) {
      setHighlightedNav(step.navHref);
      const shouldNavigate = step.navigateOnStep !== false;
      if (shouldNavigate) {
        router.push(step.navHref);
      }
      return;
    }

    setHighlightedNav(null);
  }, [open, step, router, setHighlightedNav, setTourActive]);

  useEffect(() => {
    return () => {
      setTourActive(false);
      setHighlightedNav(null);
    };
  }, [setHighlightedNav, setTourActive]);

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

  if (!open || !step) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 pointer-events-none" aria-hidden />

      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="platform-tutorial-title"
        className={cn(
          "fixed z-50 flex max-h-[min(28rem,80vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border bg-background shadow-xl",
          "bottom-4 left-4 lg:left-[17rem]"
        )}
      >
        <div className="border-b bg-muted/30 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <step.icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {permissions?.label ?? "Platform"} walkthrough · Step {stepIndex + 1} of{" "}
                  {steps.length}
                </p>
                <h2 id="platform-tutorial-title" className="text-lg font-semibold leading-tight">
                  {step.title}
                </h2>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => void handleFinish()}
              aria-label="Close walkthrough"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {step.id === "welcome" && userName ? (
              <>
                Hi {userName}! {description}
              </>
            ) : (
              description
            )}
          </p>
          {(step.navHref || step.highlightSidebar) && (
            <p className="mt-2 text-xs font-medium text-primary">
              {step.highlightSidebar
                ? "Watch the sidebar — your menu items are highlighted."
                : `Opened ${step.title} — look for the highlighted item in the sidebar.`}
            </p>
          )}
        </div>

        <StepIndicators steps={steps} activeIndex={stepIndex} />

        <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
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
              <Button type="button" size="sm" disabled={completing} onClick={() => void handleFinish()}>
                {completing ? "Saving…" : "Get started"}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={completing}
                onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
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
    <div className="flex flex-wrap justify-center gap-1.5 px-5 py-3" aria-hidden>
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
