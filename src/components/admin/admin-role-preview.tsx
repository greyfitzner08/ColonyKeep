"use client";

import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_PERMISSIONS } from "@/lib/constants";
import { PREVIEWABLE_PLATFORM_ROLES } from "@/lib/admin/role-preview.shared";
import type { UserRole } from "@/lib/types";

interface AdminRolePreviewProps {
  previewRole: UserRole | null;
}

export function AdminRolePreviewBanner({ previewRole }: AdminRolePreviewProps) {
  const router = useRouter();

  if (!previewRole) return null;

  async function exitPreview() {
    await fetch("/api/admin/role-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: null }),
    });
    router.refresh();
  }

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <div className="container mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-medium">Admin preview:</span> viewing the app as{" "}
          {ROLE_PERMISSIONS[previewRole].label}. Navigation and page access match this role.
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
  previewRole: UserRole | null;
}

export function AdminRolePreviewControl({ previewRole }: AdminRolePreviewControlProps) {
  const router = useRouter();

  async function setPreviewRole(role: UserRole | "admin") {
    await fetch("/api/admin/role-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: role === "admin" ? null : role }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 p-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-sidebar-foreground">
        <Eye className="h-3.5 w-3.5" />
        View as role
      </div>
      <Label className="sr-only">Preview platform role</Label>
      <Select
        value={previewRole ?? "admin"}
        onValueChange={(value) => setPreviewRole(value as UserRole | "admin")}
      >
        <SelectTrigger className="h-8 text-xs bg-sidebar">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Administrator (normal)</SelectItem>
          {PREVIEWABLE_PLATFORM_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_PERMISSIONS[role].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
