"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleCalendarEmbedProps {
  embedUrl: string;
  /** Start expanded when true (default). */
  defaultOpen?: boolean;
  className?: string;
}

export function GoogleCalendarEmbed({
  embedUrl,
  defaultOpen = true,
  className,
}: GoogleCalendarEmbedProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-base font-semibold">Team calendar</h2>
          <p className="text-sm text-muted-foreground">
            Shared Google Calendar for upcoming events and dates.
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t px-2 pb-2 pt-2 sm:px-3 sm:pb-3">
          <div className="overflow-hidden rounded-md border bg-background">
            <iframe
              title="Team Google Calendar"
              src={embedUrl}
              className="h-[420px] w-full border-0 sm:h-[560px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      )}
    </section>
  );
}
