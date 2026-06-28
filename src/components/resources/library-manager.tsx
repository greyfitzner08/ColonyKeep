"use client";

import { useMemo, useState, useCallback } from "react";
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
import { ExternalLink, Plus, Trash2, Upload } from "lucide-react";

const ALL_ROLES = Object.keys(ROLE_PERMISSIONS) as UserRole[];

interface LibraryManagerProps {
  documents: LibraryDocument[];
  isAdmin: boolean;
}

const emptyForm = {
  title: "",
  description: "",
  file_url: "",
  section: "General",
  new_section: "",
  view_roles: ["admin", "inquiry_team", "trap_team_lead", "volunteer"] as UserRole[],
};

export function LibraryManager({ documents: initial, isAdmin }: LibraryManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryDocument | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const sections = useMemo(() => {
    const names = new Set(initial.map((doc) => doc.section || "General"));
    names.add("General");
    if (form.section) names.add(form.section);
    if (form.new_section.trim()) names.add(form.new_section.trim());
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [initial, form.section, form.new_section]);

  const grouped = useMemo(() => {
    const map = new Map<string, LibraryDocument[]>();
    for (const doc of initial) {
      const section = doc.section || "General";
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(doc);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [initial]);

  function openNew(section = "General") {
    setEditing(null);
    setForm({ ...emptyForm, section });
    setUploadedFileName(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(doc: LibraryDocument) {
    setEditing(doc);
    setForm({
      title: doc.title,
      description: doc.description ?? "",
      file_url: doc.file_url,
      section: doc.section || "General",
      new_section: "",
      view_roles: doc.view_roles,
    });
    setUploadedFileName(null);
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

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/library-documents/upload", {
      method: "POST",
      body,
    });
    const result = await response.json().catch(() => null);
    setUploading(false);

    if (!response.ok) {
      setError(result?.error ?? "Upload failed");
      return;
    }

    setForm((prev) => ({
      ...prev,
      file_url: result.file_url,
      title: prev.title || result.file_name?.replace(/\.[^.]+$/, "") || prev.title,
    }));
    setUploadedFileName(result.file_name ?? file.name);
  }, []);

  async function save() {
    const section = form.new_section.trim() || form.section || "General";
    if (!form.title.trim() || !form.file_url.trim()) {
      setError("Title and a file or URL are required");
      return;
    }

    setError(null);
    setSaving(true);
    const response = await fetch("/api/library-documents/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        title: form.title,
        description: form.description,
        file_url: form.file_url,
        section,
        view_roles: form.view_roles,
      }),
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
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
      )}

      <div className="space-y-8">
        {grouped.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No documents available for your role yet.
            </CardContent>
          </Card>
        ) : (
          grouped.map(([section, docs]) => (
            <section key={section} className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">{section}</h2>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => openNew(section)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add to section
                  </Button>
                )}
              </div>
              <div className="grid gap-3">
                {docs.map((doc) => (
                  <Card key={doc.id}>
                    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                      <div>
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => openEdit(doc)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(doc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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
                ))}
              </div>
            </section>
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
              <div
                className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) uploadFile(file);
                }}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Drag and drop a file here</p>
                <p className="text-xs text-muted-foreground mt-1">or choose a file from your computer</p>
                <Input
                  type="file"
                  className="mt-3 max-w-xs mx-auto"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file);
                  }}
                />
                {uploading && <p className="text-sm text-muted-foreground mt-2">Uploading…</p>}
                {uploadedFileName && (
                  <p className="text-sm text-primary mt-2">Uploaded: {uploadedFileName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Or paste a link</Label>
                <Input
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  placeholder="https://…"
                />
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value, new_section: "" })}
                  >
                    {sections.map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Or create new section</Label>
                  <Input
                    value={form.new_section}
                    onChange={(e) => setForm({ ...form, new_section: e.target.value })}
                    placeholder="e.g. Handbook, SOPs"
                  />
                </div>
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
                      <Label className="font-normal">{ROLE_PERMISSIONS[role].label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={save} className="w-full" disabled={saving || uploading}>
                {saving ? "Saving…" : "Save Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
