"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type TutorialNavHighlight = string | "sidebar" | null;

interface TutorialNavigationContextValue {
  highlightedNav: TutorialNavHighlight;
  setHighlightedNav: (href: TutorialNavHighlight) => void;
  tourActive: boolean;
  setTourActive: (active: boolean) => void;
}

const TutorialNavigationContext = createContext<TutorialNavigationContextValue | null>(null);

export function PlatformTutorialNavigationProvider({ children }: { children: ReactNode }) {
  const [highlightedNav, setHighlightedNav] = useState<TutorialNavHighlight>(null);
  const [tourActive, setTourActive] = useState(false);

  const value = useMemo(
    () => ({
      highlightedNav,
      setHighlightedNav,
      tourActive,
      setTourActive,
    }),
    [highlightedNav, tourActive]
  );

  return (
    <TutorialNavigationContext.Provider value={value}>{children}</TutorialNavigationContext.Provider>
  );
}

export function useTutorialNavigation() {
  const context = useContext(TutorialNavigationContext);
  if (!context) {
    throw new Error("useTutorialNavigation must be used within PlatformTutorialNavigationProvider");
  }
  return context;
}
