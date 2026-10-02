"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

const SIGNUP_HELP =
  "Coverage shifts fill a set number of spots (with role requirements and waitlists). Attendance slots collect who’s coming or can’t make it — no spot limit.";

export function ShiftBoardTitle() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Shift Board</h1>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="About coverage and attendance signups"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <Info className="h-5 w-5" aria-hidden />
      </button>
      {open ? (
        <p
          id={panelId}
          role="note"
          className="absolute left-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border bg-popover px-3 py-2 text-sm font-normal leading-relaxed tracking-normal text-popover-foreground shadow-md"
        >
          {SIGNUP_HELP}
        </p>
      ) : null}
    </div>
  );
}
