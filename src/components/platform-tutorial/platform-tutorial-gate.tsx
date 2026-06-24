"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlatformTutorialModal } from "@/components/platform-tutorial/platform-tutorial-modal";
import type { Profile } from "@/lib/types";

interface PlatformTutorialGateProps {
  profile: Profile;
  userName?: string | null;
}

export function PlatformTutorialGate({ profile, userName }: PlatformTutorialGateProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <PlatformTutorialModal
      open={open}
      onOpenChange={setOpen}
      profile={profile}
      userName={userName}
      markCompleteOnClose
      onCompleted={() => router.refresh()}
    />
  );
}
