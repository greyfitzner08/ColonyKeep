"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TutorialMode } from "@/lib/platform-tutorial/tracks";

export type TutorialNavHighlight = string | "sidebar" | null;

const TOUR_STORAGE_KEY = "colonykeep-walkthrough";

interface StoredTour {
  open: boolean;
  mode: TutorialMode;
  stepIndex: number;
}

interface TutorialNavigationContextValue {
  highlightedNav: TutorialNavHighlight;
  setHighlightedNav: (href: TutorialNavHighlight) => void;
  tourActive: boolean;
  setTourActive: (active: boolean) => void;
  chooserOpen: boolean;
  setChooserOpen: (open: boolean) => void;
  tourOpen: boolean;
  tourMode: TutorialMode;
  stepIndex: number;
  setStepIndex: (index: number) => void;
  startTour: (mode: TutorialMode) => void;
  setTourOpen: (open: boolean) => void;
}

const TutorialNavigationContext = createContext<TutorialNavigationContextValue | null>(null);

function readStoredTour(): StoredTour | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TOUR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTour;
    if (!parsed?.open) return null;
    if (parsed.mode !== "quick" && parsed.mode !== "advanced") return null;
    return {
      open: true,
      mode: parsed.mode,
      stepIndex: Number.isFinite(parsed.stepIndex) ? Math.max(0, parsed.stepIndex) : 0,
    };
  } catch {
    return null;
  }
}

function writeStoredTour(tour: StoredTour | null) {
  if (typeof window === "undefined") return;
  try {
    if (!tour?.open) {
      sessionStorage.removeItem(TOUR_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(tour));
  } catch {
    // Ignore private-mode / quota failures.
  }
}

export function PlatformTutorialNavigationProvider({ children }: { children: ReactNode }) {
  const [highlightedNav, setHighlightedNav] = useState<TutorialNavHighlight>(null);
  const [tourActive, setTourActive] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [tourOpen, setTourOpenState] = useState(false);
  const [tourMode, setTourMode] = useState<TutorialMode>("quick");
  const [stepIndex, setStepIndexState] = useState(0);

  useEffect(() => {
    const stored = readStoredTour();
    if (!stored) return;
    setTourOpenState(true);
    setTourMode(stored.mode);
    setStepIndexState(stored.stepIndex);
  }, []);

  useEffect(() => {
    writeStoredTour(tourOpen ? { open: true, mode: tourMode, stepIndex } : null);
  }, [tourOpen, tourMode, stepIndex]);

  const startTour = useCallback((mode: TutorialMode) => {
    setChooserOpen(false);
    setTourMode(mode);
    setStepIndexState(0);
    setTourOpenState(true);
  }, []);

  const setTourOpen = useCallback((open: boolean) => {
    setTourOpenState(open);
    if (!open) {
      setStepIndexState(0);
      setHighlightedNav(null);
      setTourActive(false);
    }
  }, []);

  const setStepIndex = useCallback((index: number) => {
    setStepIndexState(Math.max(0, index));
  }, []);

  const value = useMemo(
    () => ({
      highlightedNav,
      setHighlightedNav,
      tourActive,
      setTourActive,
      chooserOpen,
      setChooserOpen,
      tourOpen,
      tourMode,
      stepIndex,
      setStepIndex,
      startTour,
      setTourOpen,
    }),
    [
      highlightedNav,
      tourActive,
      chooserOpen,
      tourOpen,
      tourMode,
      stepIndex,
      setStepIndex,
      startTour,
      setTourOpen,
    ]
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
