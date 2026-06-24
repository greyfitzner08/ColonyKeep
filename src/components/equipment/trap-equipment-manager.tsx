"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, QrCode, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { volunteerDisplayName } from "@/lib/equipment/volunteers";
import {
  TRAP_EQUIPMENT_STATUSES,
  TRAP_EQUIPMENT_TYPES,
  equipmentTypeLabel,
} from "@/lib/equipment/constants";
import type {
  EquipmentVolunteerOption,
  TrapEquipmentItem,
  TrapEquipmentStatus,
  TrapEquipmentType,
  TrapTeam,
} from "@/lib/types";
import { cn } from "@/lib/utils";

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
  volunteers: EquipmentVolunteerOption[];
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
  assigned_to_profile_id: "" as string | null,
};

const UNASSIGNED = "__unassigned__";

export function TrapEquipmentManager({
  items: initialItems,
  teams,
  volunteers,
  defaultTeamId,
  isAdmin,
}: TrapEquipmentManagerProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [editing, setEditing] = useState<TrapEquipmentItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialItems);
  }, [initialItems]);

  const teamNameById = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams]
  );

  const volunteerById = useMemo(
    () => new Map(volunteers.map((volunteer) => [volunteer.id, volunteer])),
    [volunteers]
  );

  async function persistItem(
    item: TrapEquipmentItem,
    options?: { refresh?: boolean }
  ): Promise<boolean> {
    const teamId = item.team_id || null;
    const teamName = teamId ? teamNameById.get(teamId) ?? item.team_name : item.team_name;

    const response = await fetch("/api/equipment/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        equipment_type: item.equipment_type,
        description: item.description,
        quantity: item.quantity,
        status: item.status,
        team_id: teamId,
        team_name: teamName,
        location: item.location,
        notes: item.notes,
        is_labeled: item.is_labeled ?? false,
        equipment_label: item.equipment_label,
        qr_code_data: item.qr_code_data,
        assigned_to_profile_id: item.assigned_to_profile_id,
      }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setRowError(result?.error ?? "Unable to save equipment");
      return false;
    }

    if (options?.refresh !== false) {
      router.refresh();
    }
    return true;
  }

  async function updateRow(id: string, patch: Partial<TrapEquipmentItem>) {
    const current = rows.find((row) => row.id === id);
    if (!current) return;

    let next: TrapEquipmentItem = { ...current, ...patch };

    if (patch.assigned_to_profile_id && next.status === "available") {
      next = { ...next, status: "loaned" };
    }

    if (patch.status && patch.status !== "loaned") {
      next = { ...next, assigned_to_profile_id: null };
    }

    setRowError(null);
    setSavingRowId(id);
    setRows((prev) => prev.map((row) => (row.id === id ? next : row)));

    const ok = await persistItem(next);
    setSavingRowId(null);

    if (!ok) {
      setRows(initialItems);
    }
  }

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
      assigned_to_profile_id: item.assigned_to_profile_id ?? "",
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

  async function saveDialog() {
    if (form.is_labeled && !form.equipment_label.trim()) {
      setSaveError("Enter the label text (e.g. Trap #3)");
      return;
    }

    if (form.status === "loaned" && !form.assigned_to_profile_id) {
      setSaveError("Select the TNVR volunteer borrowing this equipment");
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
        assigned_to_profile_id:
          form.status === "loaned" ? form.assigned_to_profile_id || null : null,
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

  function itemTitle(item: TrapEquipmentItem) {
    if ((item.is_labeled ?? false) && item.equipment_label) {
      return item.equipment_label;
    }
    return equipmentTypeLabel(item.equipment_type);
  }

  function renderBorrowerContact(item: TrapEquipmentItem) {
    if (item.status !== "loaned") {
      return <span className="text-muted-foreground">—</span>;
    }

    const volunteer = item.assigned_to_profile_id
      ? volunteerById.get(item.assigned_to_profile_id)
      : null;

    if (!volunteer) {
      return <span className="text-amber-700 text-xs">Select a volunteer</span>;
    }

    return (
      <div className="space-y-0.5 text-xs">
        <p className="font-medium">{volunteerDisplayName(volunteer)}</p>
        <a href={`mailto:${volunteer.email}`} className="text-primary hover:underline block">
          {volunteer.email}
        </a>
        {volunteer.phone ? (
          <a href={`tel:${volunteer.phone}`} className="text-primary hover:underline block">
            {volunteer.phone}
          </a>
        ) : (
          <p className="text-muted-foreground">No phone on file</p>
        )}
      </div>
    );
  }

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

      {rowError && <p className="text-sm text-destructive">{rowError}</p>}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No equipment logged yet. Scan a trap QR code or add traps, scanners, and other field
            gear for your team.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-3 font-medium">Item</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Qty</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium min-w-[180px]">Assigned volunteer</th>
                <th className="px-3 py-3 font-medium min-w-[160px]">Borrower contact</th>
                <th className="px-3 py-3 font-medium">Location</th>
                <th className="px-3 py-3 font-medium">Notes</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const isSaving = savingRowId === item.id;
                return (
                  <tr
                    key={item.id}
                    className={cn("border-t align-top hover:bg-muted/20", isSaving && "opacity-70")}
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium">{itemTitle(item)}</div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {equipmentTypeLabel(item.equipment_type)}
                    </td>
                    <td className="px-3 py-3">{item.quantity}</td>
                    <td className="px-3 py-3">
                      <Select
                        value={item.status}
                        disabled={isSaving}
                        onValueChange={(value) =>
                          updateRow(item.id, { status: value as TrapEquipmentStatus })
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px]">
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
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={item.assigned_to_profile_id ?? UNASSIGNED}
                        disabled={isSaving || item.status !== "loaned"}
                        onValueChange={(value) =>
                          updateRow(item.id, {
                            assigned_to_profile_id: value === UNASSIGNED ? null : value,
                            status: "loaned",
                          })
                        }
                      >
                        <SelectTrigger className="h-8 min-w-[160px]">
                          <SelectValue placeholder="Select volunteer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                          {volunteers.map((volunteer) => (
                            <SelectItem key={volunteer.id} value={volunteer.id}>
                              {volunteerDisplayName(volunteer)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.status === "loaned" && volunteers.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">No TNVR volunteers found</p>
                      )}
                    </td>
                    <td className="px-3 py-3">{renderBorrowerContact(item)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{item.location ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground max-w-[180px]">
                      <p className="line-clamp-2">{item.notes ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={deletingId === item.id}
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => {
                    const status = value as TrapEquipmentStatus;
                    setForm({
                      ...form,
                      status,
                      assigned_to_profile_id:
                        status === "loaned" ? form.assigned_to_profile_id : "",
                    });
                  }}
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

            {form.status === "loaned" && (
              <div className="space-y-2">
                <Label>Assigned TNVR volunteer</Label>
                <Select
                  value={form.assigned_to_profile_id || UNASSIGNED}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      assigned_to_profile_id: value === UNASSIGNED ? "" : value,
                      status: "loaned",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Who has this equipment?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Select volunteer</SelectItem>
                    {volunteers.map((volunteer) => (
                      <SelectItem key={volunteer.id} value={volunteer.id}>
                        {volunteerDisplayName(volunteer)}
                        {volunteer.phone ? ` · ${volunteer.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
              <Button onClick={saveDialog} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Log Equipment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
