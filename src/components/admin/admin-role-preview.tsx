"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PLATFORM_ROLE_PREVIEW_OPTIONS,
  encodeVolunteerRolePreview,
  rolePreviewLabel,
  volunteerRolesForPreview,
} from "@/lib/admin/role-preview.shared";
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
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[45] border-b border-amber-300 bg-amber-50 py-2.5 pl-14 pr-4 text-sm text-amber-950 shadow-sm sm:pl-4 lg:left-64"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="min-w-0 leading-snug">
          <span className="font-medium">Admin preview:</span> viewing the app as {previewLabel}.
          Navigation and page access match this role.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-400 bg-white hover:bg-amber-100"
          onClick={exitPreview}
        >
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
  const volunteerRoles = volunteerRolesForPreview(roleDescriptions);

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
    <>
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
        onClick={() => setOpen(true)}
      >
        <Eye className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(32rem,85vh)] max-w-md flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4 text-left">
            <DialogTitle>View as role</DialogTitle>
            <DialogDescription>
              Preview navigation and page access as another platform role or volunteer interest.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <button
              type="button"
              className={cn(
                "w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted",
                !previewKey && "bg-muted font-medium"
              )}
              onClick={() => setPreview(null)}
            >
              Administrator (normal)
            </button>

            <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Platform access
            </p>
            {PLATFORM_ROLE_PREVIEW_OPTIONS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={cn(
                  "w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted",
                  previewKey === entry.key && "bg-muted font-medium"
                )}
                onClick={() => setPreview(entry.key)}
              >
                {entry.label}
              </button>
            ))}

            {volunteerRoles.length > 0 && (
              <>
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Volunteer interests
                </p>
                {volunteerRoles.map((entry) => {
                  const key = encodeVolunteerRolePreview(entry.role_id);
                  return (
                    <button
                      key={entry.role_id}
                      type="button"
                      className={cn(
                        "w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted",
                        previewKey === key && "bg-muted font-medium"
                      )}
                      onClick={() => setPreview(key)}
                    >
                      {entry.label}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
