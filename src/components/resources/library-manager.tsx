"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_PERMISSIONS } from "@/lib/constants";
import type { LibraryDocument, UserRole } from "@/lib/types";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

const ALL_ROLES = Object.keys(ROLE_PERMISSIONS) as UserRole[];

interface LibraryManagerProps {
  documents: LibraryDocument[];
  isAdmin: boolean;
}

const emptyForm = {
  title: "",
  description: "",
  file_url: "",
  view_roles: ["admin"] as UserRole[],
  is_active: true,
};

export function LibraryManager({ documents: initial, isAdmin }: LibraryManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryDocument | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(doc: LibraryDocument) {
    setEditing(doc);
    setForm({
      title: doc.title,
      description: doc.description ?? "",
      file_url: doc.file_url,
      view_roles: doc.view_roles,
      is_active: doc.is_active,
    });
    setError(null);
    setDialogOpen(true);
  }

  function toggleRole(role: UserRole) {
    setForm((prev) => ({
      ...prev,
      view_roles: prev.view_roles.includes(role)
        ? prev.view_roles.filter((r) => r !== role)
        : [...prev.view_roles, role],
    }));
  }

  async function save() {
    setError(null);
    setSaving(true);
    const response = await fetch("/api/library-documents/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing?.id, ...form }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to save document");
      return;
    }

    setDialogOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    const response = await fetch("/api/library-documents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) router.refresh();
  }

  return (
    <>
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {initial.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No documents available for your role yet.
            </CardContent>
          </Card>
        ) : (
          initial.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{doc.title}</CardTitle>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!doc.is_active && <Badge variant="secondary">Hidden</Badge>}
                  {isAdmin && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(doc)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(doc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary underline text-sm"
                >
                  Open document
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {isAdmin && (
                  <div className="flex flex-wrap gap-1">
                    {doc.view_roles.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {ROLE_PERMISSIONS[role]?.label ?? role}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Document" : "Add Document"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>File URL</Label>
                <Input
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-2">
                <Label>Who can view</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_ROLES.map((role) => (
                    <div key={role} className="flex items-center gap-2">
                      <Checkbox
                        checked={form.view_roles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      <Label>{ROLE_PERMISSIONS[role].label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: !!v })}
                />
                <Label>Visible to permitted roles</Label>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={save} className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Save Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
