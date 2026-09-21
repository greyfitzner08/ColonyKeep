import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared page chrome: title/description on the left, a single aligned action
 * toolbar on the right (doesn’t stack buttons on top of each other).
 */
export function PageHeader({ title, description, meta, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {typeof title === "string" ? (
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          ) : (
            title
          )}
        </div>
        {description ? (
          typeof description === "string" ? (
            <p className="max-w-3xl text-muted-foreground">{description}</p>
          ) : (
            description
          )
        ) : null}
        {meta ? <div className="pt-1">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end lg:pt-1">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
