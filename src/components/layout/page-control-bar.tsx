"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PageControlBarProps {
  /** Primary search field — stays visible on all breakpoints. */
  search?: ReactNode;
  /** Secondary filters (selects, toggles). Collapsed behind a control on mobile. */
  filters?: ReactNode;
  /** Page actions (add, export, etc.). */
  actions?: ReactNode;
  /** Result count or other status text. */
  meta?: ReactNode;
  /** How many filters differ from their defaults — shown on the mobile toggle. */
  activeFilterCount?: number;
  filtersLabel?: string;
  /** Start with filters expanded on mobile. */
  defaultFiltersOpen?: boolean;
  className?: string;
  /** Accessible name for the controls region. */
  "aria-label"?: string;
}

/**
 * Compact page toolbar: search + actions always visible; filters collapse on small screens
 * so the control strip doesn’t dominate the viewport.
 */
export function PageControlBar({
  search,
  filters,
  actions,
  meta,
  activeFilterCount = 0,
  filtersLabel = "Filters",
  defaultFiltersOpen = false,
  className,
  "aria-label": ariaLabel = "Page controls",
}: PageControlBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(defaultFiltersOpen);
  const hasFilters = Boolean(filters);
  const hasPrimaryRow = Boolean(search || actions);

  return (
    <section
      aria-label={ariaLabel}
      className={cn("rounded-lg border bg-card/80 p-3 shadow-sm sm:p-4 space-y-3", className)}
    >
      {hasPrimaryRow ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {search ? <div className="min-w-0 flex-1">{search}</div> : null}
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
          ) : null}
        </div>
      ) : null}

      {(hasFilters || meta) && (
        <div className="flex flex-wrap items-center gap-2">
          {hasFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="md:hidden"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {filtersLabel}
              {activeFilterCount > 0 ? (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 font-normal">
                  {activeFilterCount}
                </Badge>
              ) : null}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")}
              />
            </Button>
          ) : null}
          {meta ? (
            <div className="min-w-0 flex-1 text-sm text-muted-foreground md:ml-auto md:flex-none md:text-right">
              {meta}
            </div>
          ) : null}
        </div>
      )}

      {hasFilters ? (
        <div
          className={cn(
            "gap-2 border-t border-border/60 pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-wrap xl:items-end",
            filtersOpen ? "grid" : "hidden",
            "md:grid"
          )}
        >
          {filters}
        </div>
      ) : null}
    </section>
  );
}

type ControlSearchProps = React.ComponentProps<typeof Input>;

/** Consistent search input for PageControlBar. */
export function ControlSearch({ className, ...props }: ControlSearchProps) {
  return (
    <div className="relative min-w-0 w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={cn("h-9 pl-9", className)} {...props} />
    </div>
  );
}
