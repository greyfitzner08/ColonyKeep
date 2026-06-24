"use client";

import { useState } from "react";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformTutorialModal } from "@/components/platform-tutorial/platform-tutorial-modal";
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
  const [open, setOpen] = useState(false);

  if (variant === "sidebar") {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start gap-2 px-2 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            className
          )}
          onClick={() => setOpen(true)}
        >
          <Compass className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Platform walkthrough</span>
        </Button>

        <PlatformTutorialModal
          open={open}
          onOpenChange={setOpen}
          profile={profile}
          userName={userName}
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
              <CardTitle className="text-lg">Platform walkthrough</CardTitle>
              <CardDescription>
                A quick tour of the volunteer portal — dashboard, queues, shifts, and where to find
                help later.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => setOpen(true)}>
            Open walkthrough
          </Button>
        </CardContent>
      </Card>

      <PlatformTutorialModal
        open={open}
        onOpenChange={setOpen}
        profile={profile}
        userName={userName}
      />
    </>
  );
}
