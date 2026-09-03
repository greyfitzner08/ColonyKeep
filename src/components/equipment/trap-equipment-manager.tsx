"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, QrCode, Loader2, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
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
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import { volunteerDisplayName } from "@/lib/equipment/volunteers";
import {
  TRAP_EQUIPMENT_STATUSES,
  TRAP_EQUIPMENT_TYPES,
  equipmentTypeLabel,
  equipmentStatusLabel,
} from "@/lib/equipment/constants";
import type {
  EquipmentVolunteerOption,
  TrapEquipmentItem,
  TrapEquipmentStatus,
  TrapEquipmentType,
  TrapTeam,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

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
  borrower_name: "",
  borrower_email: "",
  borrower_phone: "",
};

const UNASSIGNED = "__unassigned__";

type EquipmentSortKey =
  | "item"
  | "type"
  | "quantity"
  | "status"
  | "team"
  | "custodian"
  | "location";

type SortDirection = "asc" | "desc";

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
  const [sortKey, setSortKey] = useState<EquipmentSortKey>("team");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterTeamId, setFilterTeamId] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const rowsRef = useRef(rows);

  useEffect(() => {
    setRows(initialItems);
  }, [initialItems]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

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
        borrower_name: item.borrower_name,
        borrower_email: item.borrower_email,
        borrower_phone: item.borrower_phone,
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

    if (patch.status && patch.status !== "loaned") {
      next = {
        ...next,
        borrower_name: null,
        borrower_email: null,
        borrower_phone: null,
      };
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
      borrower_name: item.borrower_name ?? "",
      borrower_email: item.borrower_email ?? "",
      borrower_phone: item.borrower_phone ?? "",
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
        assigned_to_profile_id: form.assigned_to_profile_id || null,
        borrower_name: form.status === "loaned" ? form.borrower_name.trim() || null : null,
        borrower_email: form.status === "loaned" ? form.borrower_email.trim() || null : null,
        borrower_phone: form.status === "loaned" ? form.borrower_phone.trim() || null : null,
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

  const teamLabel = useCallback(
    (item: TrapEquipmentItem) => {
      if (!item.team_id) return item.team_name ?? "—";
      return teamNameById.get(item.team_id) ?? item.team_name ?? "—";
    },
    [teamNameById]
  );

  const custodianLabel = useCallback(
    (item: TrapEquipmentItem) => {
      if (!item.assigned_to_profile_id) return "Unassigned";
      const volunteer = volunteerById.get(item.assigned_to_profile_id);
      return volunteer ? volunteerDisplayName(volunteer) : "Unassigned";
    },
    [volunteerById]
  );

  function handleSort(key: EquipmentSortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rows.filter((item) => {
      if (filterTeamId !== "all" && item.team_id !== filterTeamId) return false;
      if (filterType !== "all" && item.equipment_type !== filterType) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;

      if (!query) return true;

      const haystack = [
        itemTitle(item),
        item.description,
        item.location,
        item.equipment_label,
        equipmentTypeLabel(item.equipment_type),
        teamLabel(item),
        custodianLabel(item),
        item.borrower_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rows, filterTeamId, filterType, filterStatus, searchQuery, teamLabel, custodianLabel]);

  const displayRows = useMemo(() => {
    const sorted = [...filteredRows];
    const direction = sortDirection === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case "item":
          comparison = itemTitle(a).localeCompare(itemTitle(b), undefined, { sensitivity: "base" });
          break;
        case "type":
          comparison = equipmentTypeLabel(a.equipment_type).localeCompare(
            equipmentTypeLabel(b.equipment_type),
            undefined,
            { sensitivity: "base" }
          );
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "status":
          comparison = equipmentStatusLabel(a.status).localeCompare(
            equipmentStatusLabel(b.status),
            undefined,
            { sensitivity: "base" }
          );
          break;
        case "team":
          comparison = teamLabel(a).localeCompare(teamLabel(b), undefined, { sensitivity: "base" });
          break;
        case "custodian":
          comparison = custodianLabel(a).localeCompare(custodianLabel(b), undefined, {
            sensitivity: "base",
          });
          break;
        case "location":
          comparison = (a.location ?? "").localeCompare(b.location ?? "", undefined, {
            sensitivity: "base",
          });
          break;
        default:
          comparison = 0;
      }

      if (comparison === 0) {
        comparison = itemTitle(a).localeCompare(itemTitle(b), undefined, { sensitivity: "base" });
      }

      return comparison * direction;
    });

    return sorted;
  }, [filteredRows, sortKey, sortDirection, teamLabel, custodianLabel]);

  const filtersActive =
    filterTeamId !== "all" ||
    filterType !== "all" ||
    filterStatus !== "all" ||
    searchQuery.trim().length > 0;

  function clearFilters() {
    setFilterTeamId("all");
    setFilterType("all");
    setFilterStatus("all");
    setSearchQuery("");
  }

  function saveBorrowerFields(itemId: string) {
    const row = rowsRef.current.find((entry) => entry.id === itemId);
    if (!row) return;
    void updateRow(itemId, {
      borrower_name: row.borrower_name,
      borrower_email: row.borrower_email,
      borrower_phone: row.borrower_phone,
    });
  }

  function renderBorrowerContact(item: TrapEquipmentItem, isSaving: boolean) {
    if (item.status !== "loaned") {
      return <span className="text-muted-foreground">—</span>;
    }

    return (
      <div className="space-y-1.5 min-w-[180px]">
        <Input
          className="h-9"
          placeholder="Borrower name"
          disabled={isSaving}
          value={item.borrower_name ?? ""}
          onChange={(e) =>
            setRows((prev) =>
              prev.map((row) =>
                row.id === item.id ? { ...row, borrower_name: e.target.value } : row
              )
            )
          }
          onBlur={() => saveBorrowerFields(item.id)}
        />
        <Input
          className="h-9"
          placeholder="Phone"
          type="tel"
          disabled={isSaving}
          value={item.borrower_phone ?? ""}
          onChange={(e) =>
            setRows((prev) =>
              prev.map((row) =>
                row.id === item.id ? { ...row, borrower_phone: e.target.value } : row
              )
            )
          }
          onBlur={() => saveBorrowerFields(item.id)}
        />
        <Input
          className="h-9"
          placeholder="Email"
          type="email"
          disabled={isSaving}
          value={item.borrower_email ?? ""}
          onChange={(e) =>
            setRows((prev) =>
              prev.map((row) =>
                row.id === item.id ? { ...row, borrower_email: e.target.value } : row
              )
            )
          }
          onBlur={() => saveBorrowerFields(item.id)}
        />
      </div>
    );
  }

  function renderCustodian(item: TrapEquipmentItem) {
    const volunteer = item.assigned_to_profile_id
      ? volunteerById.get(item.assigned_to_profile_id)
      : null;
    if (!volunteer) return null;
    return (
      <p className="text-sm text-muted-foreground mt-1">
        {volunteer.phone ? (
          <a href={`tel:${volunteer.phone}`} className="text-primary hover:underline">
            {volunteer.phone}
          </a>
        ) : (
          volunteer.email
        )}
      </p>
    );
  }

  const renderSortHeader = useCallback(
    (label: string, key: EquipmentSortKey) => {
      const isActive = sortKey === key;
      const Icon = !isActive ? ArrowUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown;
      return (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-left text-muted-foreground hover:text-foreground"
          onClick={() => handleSort(key)}
        >
          {label}
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      );
    },
    [sortDirection, sortKey]
  );

  const equipmentColumns = useMemo((): DataTableColumn<TrapEquipmentItem>[] => {
    return [
      {
        id: "item",
        label: "Item",
        header: renderSortHeader("Item", "item"),
        defaultWidth: 180,
        render: (item) => (
          <>
            <div className="font-medium">{itemTitle(item)}</div>
            {item.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
            )}
          </>
        ),
      },
      {
        id: "type",
        label: "Type",
        header: renderSortHeader("Type", "type"),
        defaultWidth: 120,
        render: (item) => (
          <span className="text-muted-foreground">{equipmentTypeLabel(item.equipment_type)}</span>
        ),
      },
      {
        id: "quantity",
        label: "Qty",
        header: renderSortHeader("Qty", "quantity"),
        defaultWidth: 72,
        minWidth: 56,
        render: (item) => item.quantity,
      },
      {
        id: "status",
        label: "Status",
        header: renderSortHeader("Status", "status"),
        defaultWidth: 160,
        render: (item) => {
          const isSaving = savingRowId === item.id;
          return (
            <Select
              value={item.status}
              disabled={isSaving}
              onValueChange={(value) => updateRow(item.id, { status: value as TrapEquipmentStatus })}
            >
              <SelectTrigger className="h-9 w-[140px]">
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
          );
        },
      },
      {
        id: "team",
        label: "Trap team",
        header: renderSortHeader("Trap team", "team"),
        defaultWidth: 130,
        render: (item) => teamLabel(item),
      },
      {
        id: "custodian",
        label: "Keeps equipment",
        header: renderSortHeader("Keeps equipment", "custodian"),
        defaultWidth: 200,
        render: (item) => {
          const isSaving = savingRowId === item.id;
          return (
            <>
              <Select
                value={item.assigned_to_profile_id ?? UNASSIGNED}
                disabled={isSaving}
                onValueChange={(value) =>
                  updateRow(item.id, {
                    assigned_to_profile_id: value === UNASSIGNED ? null : value,
                  })
                }
              >
                <SelectTrigger className="h-9 min-w-[160px]">
                  <SelectValue placeholder="TNVR volunteer" />
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
              {renderCustodian(item)}
              {volunteers.length === 0 && (
                <p className="mt-1 text-sm text-muted-foreground">No TNVR volunteers found</p>
              )}
            </>
          );
        },
      },
      {
        id: "borrower",
        label: "Public borrower",
        defaultWidth: 200,
        render: (item) => renderBorrowerContact(item, savingRowId === item.id),
      },
      {
        id: "location",
        label: "Location",
        header: renderSortHeader("Location", "location"),
        defaultWidth: 150,
        render: (item) => <span className="text-muted-foreground">{item.location ?? "—"}</span>,
      },
      {
        id: "actions",
        label: "Actions",
        defaultWidth: 110,
        minWidth: 96,
        render: (item) => {
          const isSaving = savingRowId === item.id;
          return (
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
          );
        },
      },
    ];
  }, [
    deletingId,
    renderSortHeader,
    savingRowId,
    teamLabel,
    volunteers,
  ]);

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
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1.5 min-w-[200px] flex-1">
              <Label htmlFor="equipment-search">Search</Label>
              <Input
                id="equipment-search"
                placeholder="Label, location, volunteer, borrower..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            {isAdmin && teams.length > 0 && (
              <div className="space-y-1.5 min-w-[180px]">
                <Label>Trap team</Label>
                <Select value={filterTeamId} onValueChange={setFilterTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All teams</SelectItem>
                    {sortTrapTeams(teams).map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5 min-w-[180px]">
              <Label>Equipment type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {TRAP_EQUIPMENT_TYPES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[180px]">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {TRAP_EQUIPMENT_STATUSES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filtersActive && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Showing {displayRows.length} of {rows.length} items
            {filtersActive ? " (filtered)" : ""}
          </p>

          {displayRows.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No equipment matches your filters.{" "}
                <button type="button" className="text-primary underline" onClick={clearFilters}>
                  Clear filters
                </button>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              tableId="trap-equipment"
              columns={equipmentColumns}
              rows={displayRows}
              getRowKey={(item) => item.id}
              getRowClassName={(item) => (savingRowId === item.id ? "opacity-70" : undefined)}
              emptyMessage="No equipment matches your filters."
              minTableWidth={1050}
              enableSearch={false}
            />
          )}
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
                  <p className="text-sm text-muted-foreground">
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
                <NumberInput
                  integer
                  min={1}
                  emptyValue={1}
                  value={form.quantity}
                  disabled={form.is_labeled}
                  onValueChange={(value) => {
                    if (typeof value === "number") setForm({ ...form, quantity: value });
                  }}
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
                      borrower_name: status === "loaned" ? form.borrower_name : "",
                      borrower_email: status === "loaned" ? form.borrower_email : "",
                      borrower_phone: status === "loaned" ? form.borrower_phone : "",
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

            <div className="space-y-2">
              <Label>TNVR volunteer who keeps this</Label>
              <Select
                value={form.assigned_to_profile_id || UNASSIGNED}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    assigned_to_profile_id: value === UNASSIGNED ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Who stores / maintains this gear?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {volunteers.map((volunteer) => (
                    <SelectItem key={volunteer.id} value={volunteer.id}>
                      {volunteerDisplayName(volunteer)}
                      {volunteer.phone ? ` · ${volunteer.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                The team volunteer responsible for this equipment in inventory.
              </p>
            </div>

            {form.status === "loaned" && (
              <div className="rounded-lg border p-3 space-y-3">
                <div>
                  <Label className="font-medium">Public borrower contact</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Person borrowing the gear (community member, not necessarily a volunteer).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="borrower-name">Name</Label>
                  <Input
                    id="borrower-name"
                    placeholder="Borrower full name"
                    value={form.borrower_name}
                    onChange={(e) => setForm({ ...form, borrower_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="borrower-phone">Phone</Label>
                    <Input
                      id="borrower-phone"
                      type="tel"
                      placeholder="(555) 555-5555"
                      value={form.borrower_phone}
                      onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="borrower-email">Email</Label>
                    <Input
                      id="borrower-email"
                      type="email"
                      placeholder="name@example.com"
                      value={form.borrower_email}
                      onChange={(e) => setForm({ ...form, borrower_email: e.target.value })}
                    />
                  </div>
                </div>
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
                    {sortTrapTeams(teams).map((team) => (
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
              <p className="text-sm text-muted-foreground">
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
