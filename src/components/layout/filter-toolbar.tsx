import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Responsive filter/action toolbar: stacks on phones, wraps on larger screens.
 * Prefer full-width controls on xs (`w-full sm:w-[…]` on SelectTrigger/Input).
 */
export function FilterToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center",
        className
      )}
    >
      {children}
    </div>
  );
}
