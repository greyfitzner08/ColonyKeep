"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, QrCode, Tag } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseEquipmentQrPayload } from "@/lib/equipment/qr-parse";
import {
  TRAP_EQUIPMENT_STATUSES,
  TRAP_EQUIPMENT_TYPES,
  equipmentStatusLabel,
  equipmentTypeLabel,
} from "@/lib/equipment/constants";
import type {
  TrapEquipmentItem,
  TrapEquipmentStatus,
  TrapEquipmentType,
  TrapTeam,
} from "@/lib/types";

const EquipmentQrScanner = dynamic(
  () =>
    import("@/components/equipment/equipment-qr-scanner").then(
      (module) => module.EquipmentQrScanner
    ),
  { ssr: false }
);

interface TrapEquipmentManagerProps {
  items: TrapEquipmentItem[];
  teams: TrapTeam[];
  defaultTeamId: string | null;
  isAdmin: boolean;
}

const emptyForm = {
  equipment_type: "gravity_trap" as TrapEquipmentType,
  description: "",
  quantity: 1,
  status: "available" as TrapEquipmentStatus,
  team_id: "" as string | null,
  location: "",
  notes: "",
  is_labeled: false,
  equipment_label: "",
  qr_code_data: "" as string | null,
};

export function TrapEquipmentManager({
  items: initialItems,
  teams,
  defaultTeamId,
  isAdmin,
}: TrapEquipmentManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [editing, setEditing] = useState<TrapEquipmentItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  const teamNameById = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams]
  );

  function openNew() {
    setEditing(null);
    setForm({
      ...emptyForm,
      team_id: defaultTeamId ?? "",
    });
    setSaveError(null);
    setScanNotice(null);
    setDialogOpen(true);
  }

  function openEdit(item: TrapEquipmentItem) {
    setEditing(item);
    setForm({
      equipment_type: item.equipment_type,
      description: item.description ?? "",
      quantity: item.quantity,
      status: item.status,
      team_id: item.team_id ?? "",
      location: item.location ?? "",
      notes: item.notes ?? "",
      is_labeled: item.is_labeled ?? false,
      equipment_label: item.equipment_label ?? "",
      qr_code_data: item.qr_code_data,
    });
    setSaveError(null);
    setScanNotice(null);
    setDialogOpen(true);
  }

  const applyQrScan = useCallback((payload: string) => {
    const parsed = parseEquipmentQrPayload(payload);
    setForm((prev) => ({
      ...prev,
      equipment_type: parsed.equipment_type ?? prev.equipment_type,
      description: parsed.description ?? prev.description,
      location: parsed.location ?? prev.location,
      notes: parsed.notes ?? prev.notes,
      is_labeled: parsed.is_labeled ?? prev.is_labeled,
      equipment_label: parsed.equipment_label ?? prev.equipment_label,
      qr_code_data: parsed.qr_code_data,
      quantity: parsed.is_labeled || parsed.equipment_label ? 1 : prev.quantity,
    }));
    setScanNotice("QR code scanned — review the fields below and save.");
  }, []);

  const handleQrScan = useCallback(
    (payload: string) => {
      setScannerOpen(false);
      if (!dialogOpen) {
        setEditing(null);
        setForm({
          ...emptyForm,
          team_id: defaultTeamId ?? "",
        });
        setSaveError(null);
        setDialogOpen(true);
      }
      applyQrScan(payload);
    },
    [applyQrScan, defaultTeamId, dialogOpen]
  );

  async function save() {
    if (form.is_labeled && !form.equipment_label.trim()) {
      setSaveError("Enter the label text (e.g. Trap #3)");
      return;
    }

    setSaveError(null);
    setSaving(true);

    const teamId = form.team_id || null;
    const teamName = teamId ? teamNameById.get(teamId) ?? null : null;

    const response = await fetch("/api/equipment/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        equipment_type: form.equipment_type,
        description: form.description.trim() || null,
        quantity: form.quantity,
        status: form.status,
        team_id: teamId,
        team_name: teamName,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
        is_labeled: form.is_labeled,
        equipment_label: form.is_labeled ? form.equipment_label.trim() : null,
        qr_code_data: form.qr_code_data,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to save equipment");
      return;
    }

    setDialogOpen(false);
    router.refresh();
  }

  async function removeItem(id: string) {
    if (!confirm("Remove this equipment entry?")) return;

    setDeletingId(id);
    const response = await fetch("/api/equipment/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      alert(result?.error ?? "Unable to delete equipment");
      return;
    }

    router.refresh();
  }

  const statusVariant = (status: TrapEquipmentStatus) => {
    switch (status) {
      case "available":
        return "default";
      case "loaned":
        return "secondary";
      case "maintenance":
        return "outline";
      case "retired":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setScannerOpen(true)}>
          <QrCode className="mr-2 h-4 w-4" />
          Scan QR Code
        </Button>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Log Equipment
        </Button>
      </div>

      {initialItems.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No equipment logged yet. Scan a trap QR code or add traps, scanners, and other field
            gear for your team.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {initialItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {(item.is_labeled ?? false) && item.equipment_label
                        ? item.equipment_label
                        : equipmentTypeLabel(item.equipment_type)}
                    </CardTitle>
                    {(item.is_labeled ?? false) && item.equipment_label && (
                      <p className="text-sm text-muted-foreground">
                        {equipmentTypeLabel(item.equipment_type)}
                      </p>
                    )}
                  </div>
                  <Badge variant={statusVariant(item.status)}>
                    {equipmentStatusLabel(item.status)}
                  </Badge>
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(item.is_labeled ?? false) && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Physically labeled</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">{item.quantity}</span>
                </div>
                {(item.team_name || item.team_id) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Team</span>
                    <span className="font-medium text-right">
                      {item.team_name ??
                        (item.team_id ? teamNameById.get(item.team_id) : null) ??
                        "—"}
                    </span>
                  </div>
                )}
                {item.location && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Location</span>
                    <span className="font-medium text-right">{item.location}</span>
                  </div>
                )}
                {item.notes && (
                  <p className="text-muted-foreground border-t pt-2">{item.notes}</p>
                )}
                <p className="text-xs text-muted-foreground border-t pt-2">
                  Logged by {item.logged_by_name ?? item.logged_by_email}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={deletingId === item.id}
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {scannerOpen && (
        <EquipmentQrScanner
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={handleQrScan}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Equipment" : "Log Equipment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setScannerOpen(true)}
              >
                <QrCode className="mr-2 h-4 w-4" />
                Scan QR Code
              </Button>
            </div>
            {scanNotice && (
              <p className="text-sm text-primary bg-primary/10 rounded-md px-3 py-2">{scanNotice}</p>
            )}

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="equipment-labeled"
                  checked={form.is_labeled}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      is_labeled: !!checked,
                      equipment_label: checked ? form.equipment_label : "",
                      quantity: checked ? 1 : form.quantity,
                    })
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="equipment-labeled" className="font-medium">
                    Equipment has a physical label
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Check this for individually tagged traps like &quot;Trap #3&quot;.
                  </p>
                </div>
              </div>
              {form.is_labeled && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="equipment-label">Label text</Label>
                  <Input
                    id="equipment-label"
                    placeholder="e.g. Trap #3"
                    value={form.equipment_label}
                    onChange={(e) =>
                      setForm({ ...form, equipment_label: e.target.value, quantity: 1 })
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Equipment Type</Label>
              <Select
                value={form.equipment_type}
                onValueChange={(value) =>
                  setForm({ ...form, equipment_type: value as TrapEquipmentType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRAP_EQUIPMENT_TYPES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="e.g. Large Tomahawk, brand/model"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  disabled={form.is_labeled}
                  onChange={(e) =>
                    setForm({ ...form, quantity: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
                {form.is_labeled && (
                  <p className="text-xs text-muted-foreground">Labeled items are logged as 1 unit.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({ ...form, status: value as TrapEquipmentStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAP_EQUIPMENT_STATUSES.map((entry) => (
                      <SelectItem key={entry.value} value={entry.value}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isAdmin && teams.length > 0 && (
              <div className="space-y-2">
                <Label>Trap Team</Label>
                <Select
                  value={form.team_id ?? ""}
                  onValueChange={(value) => setForm({ ...form, team_id: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Storage Location (optional)</Label>
              <Input
                placeholder="e.g. Team lead garage, shed #2"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {!isAdmin && defaultTeamId && (
              <p className="text-xs text-muted-foreground">
                This entry will be assigned to your trap team.
              </p>
            )}

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Log Equipment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
