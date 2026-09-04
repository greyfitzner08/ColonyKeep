"use client";

import { useMemo, useState } from "react";
import { Compass, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlatformTutorialModal } from "@/components/platform-tutorial/platform-tutorial-modal";
import { advancedTrackForProfile } from "@/lib/platform-tutorial/tracks";
import type { TutorialMode } from "@/lib/platform-tutorial/tracks";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

interface PlatformTutorialTriggerProps {
  profile: Profile | null;
  userName?: string | null;
  variant?: "card" | "sidebar";
  className?: string;
}

export function PlatformTutorialTrigger({
  profile,
  userName,
  variant = "card",
  className,
}: PlatformTutorialTriggerProps) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [mode, setMode] = useState<TutorialMode>("quick");
  const advancedTrack = useMemo(() => advancedTrackForProfile(profile), [profile]);

  function startTour(nextMode: TutorialMode) {
    setMode(nextMode);
    setChooserOpen(false);
    setTourOpen(true);
  }

  if (variant === "sidebar") {
    return (
      <>
        <Button
          type="button"
          variant="sidebar"
          className={cn("h-auto w-full justify-start gap-2 px-2 py-2", className)}
          onClick={() => setChooserOpen(true)}
        >
          <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">Walkthroughs</span>
        </Button>

        <WalkthroughChooser
          open={chooserOpen}
          onOpenChange={setChooserOpen}
          advancedTrackTitle={advancedTrack?.title}
          advancedTrackSummary={advancedTrack?.summary}
          advancedRoleLabel={advancedTrack?.roleLabel}
          onSelect={startTour}
        />

        <PlatformTutorialModal
          open={tourOpen}
          onOpenChange={setTourOpen}
          profile={profile}
          userName={userName}
          mode={mode}
        />
      </>
    );
  }

  return (
    <>
      <Card className={cn("border-primary/20 bg-primary/5", className)} id="platform-walkthrough">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Compass className="h-5 w-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">Walkthroughs</CardTitle>
              <CardDescription>
                Take a quick tour of your pages, or an advanced role walkthrough that explains how
                actions connect across the system.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={() => startTour("quick")}>
            Quick page tour
          </Button>
          <Button type="button" variant="outline" onClick={() => startTour("advanced")}>
            Advanced · {advancedTrack?.roleLabel ?? "Your role"}
          </Button>
        </CardContent>
        {advancedTrack && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{advancedTrack.title}: </span>
              {advancedTrack.summary}
            </p>
          </CardContent>
        )}
      </Card>

      <PlatformTutorialModal
        open={tourOpen}
        onOpenChange={setTourOpen}
        profile={profile}
        userName={userName}
        mode={mode}
      />
    </>
  );
}

function WalkthroughChooser({
  open,
  onOpenChange,
  advancedTrackTitle,
  advancedTrackSummary,
  advancedRoleLabel,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advancedTrackTitle?: string;
  advancedTrackSummary?: string;
  advancedRoleLabel?: string;
  onSelect: (mode: TutorialMode) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a walkthrough</DialogTitle>
          <DialogDescription>
            Quick tour covers where pages live. Advanced explains actions and how modules connect for
            your role.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <button
            type="button"
            className="rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
            onClick={() => onSelect("quick")}
          >
            <div className="flex items-start gap-3">
              <Compass className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">Quick page tour</p>
                <p className="text-sm text-muted-foreground">
                  Sidebar map of the pages available to you.
                </p>
              </div>
            </div>
          </button>
          <button
            type="button"
            className="rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
            onClick={() => onSelect("advanced")}
          >
            <div className="flex items-start gap-3">
              <Route className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">
                  Advanced · {advancedRoleLabel ?? "Your role"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {advancedTrackTitle
                    ? `${advancedTrackTitle}. ${advancedTrackSummary ?? ""}`
                    : "Workflow-focused walkthrough for your access level."}
                </p>
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
