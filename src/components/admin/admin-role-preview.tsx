"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_PERMISSIONS } from "@/lib/constants";
import {
  PREVIEWABLE_PLATFORM_ROLES,
  encodeVolunteerRolePreview,
  rolePreviewLabel,
} from "@/lib/admin/role-preview.shared";
import { adminAssignableVolunteerRoles } from "@/lib/volunteers/role-catalog";
import { cn } from "@/lib/utils";
import type { RoleDescription } from "@/lib/types";

interface AdminRolePreviewProps {
  previewKey: string | null;
  previewLabel: string | null;
}

export function AdminRolePreviewBanner({ previewKey, previewLabel }: AdminRolePreviewProps) {
  const router = useRouter();

  if (!previewKey || !previewLabel) return null;

  async function exitPreview() {
    await fetch("/api/admin/role-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview: null }),
    });
    router.refresh();
  }

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <div className="container mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-medium">Admin preview:</span> viewing the app as {previewLabel}.
          Navigation and page access match this role.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={exitPreview}>
          <X className="h-4 w-4 mr-1.5" />
          Exit preview
        </Button>
      </div>
    </div>
  );
}

interface AdminRolePreviewControlProps {
  previewKey: string | null;
  roleDescriptions: RoleDescription[];
}

export function AdminRolePreviewControl({
  previewKey,
  roleDescriptions,
}: AdminRolePreviewControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const volunteerRoles = adminAssignableVolunteerRoles(roleDescriptions);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function setPreview(nextKey: string | null) {
    await fetch("/api/admin/role-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview: nextKey }),
    });
    setOpen(false);
    router.refresh();
  }

  const activeLabel = rolePreviewLabel(previewKey, roleDescriptions);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "h-8 w-8 text-sidebar-foreground/80 hover:text-sidebar-foreground",
          previewKey && "text-amber-700 hover:text-amber-800"
        )}
        aria-label={activeLabel ? `Viewing as ${activeLabel}. Change preview role.` : "View app as another role"}
        title={activeLabel ? `Viewing as ${activeLabel}` : "View as role"}
        onClick={() => setOpen((current) => !current)}
      >
        <Eye className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-64 max-h-80 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <button
            type="button"
            className={cn(
              "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
              !previewKey && "bg-muted font-medium"
            )}
            onClick={() => setPreview(null)}
          >
            Administrator (normal)
          </button>

          <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Platform access
          </p>
          {PREVIEWABLE_PLATFORM_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              className={cn(
                "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
                previewKey === role && "bg-muted font-medium"
              )}
              onClick={() => setPreview(role)}
            >
              {ROLE_PERMISSIONS[role].label}
            </button>
          ))}

          <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Volunteer roles
          </p>
          {volunteerRoles.map((entry) => {
            const key = encodeVolunteerRolePreview(entry.role_id);
            return (
              <button
                key={entry.role_id}
                type="button"
                className={cn(
                  "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
                  previewKey === key && "bg-muted font-medium"
                )}
                onClick={() => setPreview(key)}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
