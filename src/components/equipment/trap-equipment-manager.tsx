"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, QrCode, Loader2, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";
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
import { ControlSearch, PageControlBar } from "@/components/layout/page-control-bar";
import { parseEquipmentQrPayload } from "@/lib/equipment/qr-parse";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import { volunteerDisplayName } from "@/lib/equipment/volunteers";
import {
  EQUIPMENT_STATUS_COLORS,
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
import { Badge } from "@/components/ui/badge";
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
  currentProfileId: string;
  currentUserName: string;
  isAdmin: boolean;
}

const emptyForm = {
  equipment_type: "gravity_trap" as TrapEquipmentType,
  description: "",
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

type EquipmentDialogSectionId = "trap" | "custody" | "loan" | "notes";

const DEFAULT_OPEN_SECTIONS: Record<EquipmentDialogSectionId, boolean> = {
  trap: false,
  custody: false,
  loan: true,
  notes: false,
};

const NEW_EQUIPMENT_OPEN_SECTIONS: Record<EquipmentDialogSectionId, boolean> = {
  trap: true,
  custody: false,
  loan: true,
  notes: false,
};

function EquipmentDialogSection({
  title,
  description,
  open,
  onOpenChange,
  className,
  headerClassName,
  accent,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  headerClassName?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border", className)}>
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-2 p-4 text-left hover:bg-muted/40",
          headerClassName
        )}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 transition-transform",
            accent ? "text-primary" : "text-muted-foreground",
            !open && "-rotate-90"
          )}
        />
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", accent && "text-primary")}>{title}</p>
          <p className={cn("text-xs", accent ? "text-primary/70" : "text-muted-foreground")}>
            {description}
          </p>
        </div>
      </button>
      {open ? (
        <div
          className={cn(
            "space-y-3 border-t px-4 pb-4 pt-3",
            accent && "border-primary/20"
          )}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

type EquipmentSortKey = "item" | "status" | "assigned" | "loaned";

type SortDirection = "asc" | "desc";

export function TrapEquipmentManager({
  items: initialItems,
  teams,
  volunteers,
  defaultTeamId,
  currentProfileId,
  currentUserName,
  isAdmin,
}: TrapEquipmentManagerProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerPurpose, setScannerPurpose] = useState<"claim" | "identify">("claim");
  const [editing, setEditing] = useState<TrapEquipmentItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<EquipmentSortKey>("assigned");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterTeamId, setFilterTeamId] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] =
    useState<Record<EquipmentDialogSectionId, boolean>>(DEFAULT_OPEN_SECTIONS);
  const loanSectionRef = useRef<HTMLDivElement>(null);
  const pendingLoanScroll = useRef(false);

  useEffect(() => {
    if (!pendingLoanScroll.current || form.status !== "loaned" || !dialogOpen) return;
    pendingLoanScroll.current = false;
    loanSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [form.status, dialogOpen, openSections.loan]);

  function setSectionOpen(id: EquipmentDialogSectionId, open: boolean) {
    setOpenSections((current) => ({ ...current, [id]: open }));
  }

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
        quantity: 1,
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

    if (patch.status === "loaned" && !current.borrower_name?.trim()) {
      openEdit({ ...current, status: "loaned" });
      setSaveError("Enter who this trap was loaned to before saving.");
      return;
    }

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
    setOpenSections(NEW_EQUIPMENT_OPEN_SECTIONS);
    setSaveError(null);
    setScanNotice(null);
    setDialogOpen(true);
  }

  function openEdit(item: TrapEquipmentItem) {
    setEditing(item);
    setForm({
      equipment_type: item.equipment_type,
      description: item.description ?? "",
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
    setOpenSections({
      ...DEFAULT_OPEN_SECTIONS,
      custody: true,
      loan: item.status === "loaned",
      trap: false,
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
    }));
    setScanNotice("QR code scanned — review the fields below and save.");
  }, []);

  async function claimScannedEquipment(payload: string) {
    const scanned = payload.trim();
    const match = rows.find((item) => item.qr_code_data?.trim() === scanned);
    if (!match) {
      setScanNotice("No logged equipment matches that QR code.");
      return;
    }

    const title = itemTitle(match);
    if (match.assigned_to_profile_id === currentProfileId) {
      setScanNotice(`You're already the volunteer using ${title}.`);
      return;
    }

    const next = { ...match, assigned_to_profile_id: currentProfileId };
    setRowError(null);
    setScanNotice(null);
    setSavingRowId(match.id);
    setRows((prev) => prev.map((row) => (row.id === match.id ? next : row)));
    const ok = await persistItem(next);
    setSavingRowId(null);
    if (!ok) {
      setRows(initialItems);
      return;
    }
    setScanNotice(`${title} is now checked out to you.`);
  }

  function handleQrScan(payload: string) {
    setScannerOpen(false);
    if (scannerPurpose === "identify") {
      applyQrScan(payload);
      return;
    }
    void claimScannedEquipment(payload);
  }

  async function saveDialog() {
    if (!editing && form.is_labeled && !form.equipment_label.trim()) {
      setSaveError("Enter the label text (e.g. Trap #3)");
      return;
    }

    if (!editing && form.equipment_type === "other" && !form.description.trim()) {
      setSectionOpen("trap", true);
      setSaveError("Enter what this other equipment item is.");
      return;
    }

    if (form.status === "loaned" && !form.borrower_name.trim()) {
      setSectionOpen("loan", true);
      setSaveError("Enter the borrower's name before marking this trap as loaned out.");
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
        quantity: 1,
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
    if (item.equipment_type === "other" && item.description?.trim()) {
      return item.description.trim();
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
      if (item.assigned_to_profile_id === currentProfileId) {
        return currentUserName || "You";
      }
      const volunteer = volunteerById.get(item.assigned_to_profile_id);
      return volunteer ? volunteerDisplayName(volunteer) : "Unassigned";
    },
    [currentProfileId, currentUserName, volunteerById]
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
        case "status":
          comparison = equipmentStatusLabel(a.status).localeCompare(
            equipmentStatusLabel(b.status),
            undefined,
            { sensitivity: "base" }
          );
          break;
        case "assigned": {
          const aAssigned = `${custodianLabel(a)} ${teamLabel(a)} ${a.location ?? ""}`;
          const bAssigned = `${custodianLabel(b)} ${teamLabel(b)} ${b.location ?? ""}`;
          comparison = aAssigned.localeCompare(bAssigned, undefined, { sensitivity: "base" });
          break;
        }
        case "loaned":
          comparison = (a.borrower_name ?? "").localeCompare(b.borrower_name ?? "", undefined, {
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

  function borrowerSummary(item: TrapEquipmentItem) {
    if (item.status !== "loaned") return null;
    const contact = [item.borrower_phone, item.borrower_email]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(" · ");
    return {
      name: item.borrower_name?.trim() || null,
      contact: contact || null,
    };
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
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
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
        defaultWidth: 240,
        wrap: true,
        render: (item) => {
          const title = itemTitle(item);
          const typeLabel = equipmentTypeLabel(item.equipment_type);
          const description = item.description?.trim() || null;
          const showType = title !== typeLabel;
          const showDescription =
            Boolean(description) &&
            !(item.equipment_type === "other" && description === title);
          return (
            <button
              type="button"
              className="min-w-0 space-y-0.5 text-left"
              onClick={() => openEdit(item)}
              aria-label={`Edit ${title}`}
            >
              <span className="block font-medium leading-snug text-primary underline-offset-2 hover:underline">
                {title}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {[showType ? typeLabel : null, showDescription ? description : null]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </span>
            </button>
          );
        },
      },
      {
        id: "status",
        label: "Status",
        header: renderSortHeader("Status", "status"),
        defaultWidth: 140,
        minWidth: 120,
        render: (item) => {
          const isSaving = savingRowId === item.id;
          return (
            <Select
              value={item.status}
              disabled={isSaving}
              onValueChange={(value) => updateRow(item.id, { status: value as TrapEquipmentStatus })}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-full border font-medium shadow-none",
                  EQUIPMENT_STATUS_COLORS[item.status]
                )}
              >
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
        id: "assigned",
        label: "With",
        header: renderSortHeader("With", "assigned"),
        defaultWidth: 200,
        wrap: true,
        render: (item) => {
          const custodian = custodianLabel(item);
          const team = teamLabel(item);
          const location = item.location?.trim();
          const meta = [team !== "—" ? team : null, location || null].filter(Boolean).join(" · ");
          const volunteer = item.assigned_to_profile_id
            ? volunteerById.get(item.assigned_to_profile_id)
            : null;
          const contact = volunteer?.phone || volunteer?.email || null;

          return (
            <div className="min-w-0 space-y-0.5">
              <p className={cn("truncate text-sm", custodian === "Unassigned" && "text-muted-foreground")}>
                {custodian}
              </p>
              {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
              {contact && (
                <p className="truncate text-xs text-muted-foreground">
                  {volunteer?.phone ? (
                    <a href={`tel:${volunteer.phone}`} className="text-primary hover:underline">
                      {volunteer.phone}
                    </a>
                  ) : (
                    contact
                  )}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "loaned",
        label: "Loaned to",
        header: renderSortHeader("Loaned to", "loaned"),
        defaultWidth: 180,
        wrap: true,
        render: (item) => {
          const borrower = borrowerSummary(item);
          if (!borrower) {
            return <span className="text-muted-foreground">—</span>;
          }
          if (!borrower.name) {
            return <span className="text-sm text-amber-800">Name needed</span>;
          }
          return (
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-medium">{borrower.name}</p>
              {borrower.contact ? (
                <p className="truncate text-xs text-muted-foreground">{borrower.contact}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        label: "Actions",
        defaultWidth: 96,
        minWidth: 88,
        hideable: false,
        render: (item) => {
          const isSaving = savingRowId === item.id;
          return (
            <div className="flex items-center gap-0.5">
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
    custodianLabel,
    deletingId,
    openEdit,
    renderSortHeader,
    savingRowId,
    teamLabel,
    volunteerById,
  ]);

  return (
    <div className="space-y-4">
      {rowError && <p className="text-sm text-destructive">{rowError}</p>}
      {scanNotice && !dialogOpen ? (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{scanNotice}</p>
      ) : null}

      {rows.length === 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setScannerPurpose("claim");
                setScannerOpen(true);
              }}
            >
              <QrCode className="mr-1.5 h-4 w-4" />
              Scan to claim
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              Log equipment
            </Button>
          </div>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No equipment logged yet. Scan a trap QR code or add traps, scanners, and other field
              gear for your team.
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="space-y-3">
          <PageControlBar
            activeFilterCount={
              (filterTeamId !== "all" ? 1 : 0) +
              (filterType !== "all" ? 1 : 0) +
              (filterStatus !== "all" ? 1 : 0)
            }
            search={
              <ControlSearch
                id="equipment-search"
                placeholder="Search label, location, volunteer, borrower…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search equipment"
              />
            }
            filters={
              <>
                {isAdmin && teams.length > 0 ? (
                  <Select value={filterTeamId} onValueChange={setFilterTeamId}>
                    <SelectTrigger className="h-9 w-full sm:w-[150px]">
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
                ) : null}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-9 w-full sm:w-[150px]">
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
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 w-full sm:w-[140px]">
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
                {filtersActive ? (
                  <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
                    Clear
                  </Button>
                ) : null}
              </>
            }
            primaryActions={
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" />
                Log equipment
              </Button>
            }
            actions={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setScannerPurpose("claim");
                  setScannerOpen(true);
                }}
              >
                <QrCode className="mr-1.5 h-4 w-4" />
                Scan to claim
              </Button>
            }
            meta={
              <>
                {displayRows.length} of {rows.length} items
                {filtersActive ? " · filtered" : ""}
              </>
            }
          />

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
              tableId="trap-equipment-v2"
              columns={equipmentColumns}
              rows={displayRows}
              getRowKey={(item) => item.id}
              getRowClassName={(item) => (savingRowId === item.id ? "opacity-70" : undefined)}
              emptyMessage="No equipment matches your filters."
              minTableWidth={760}
              enableSearch={false}
              clipCellContent
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
          <div className="space-y-5">
            <EquipmentDialogSection
              title="Status & custody"
              description="Where the trap sits in inventory and who is responsible for it."
              open={openSections.custody}
              onOpenChange={(open) => setSectionOpen("custody", open)}
            >
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
                    if (status === "loaned") {
                      setSectionOpen("loan", true);
                      setSaveError(null);
                      pendingLoanScroll.current = true;
                    }
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

              {isAdmin && teams.length > 0 && (
                <div className="space-y-2">
                  <Label>Trap team</Label>
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
                <Label>Storage location (optional)</Label>
                <Input
                  placeholder="e.g. Team lead garage, shed #2"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
            </EquipmentDialogSection>

            {form.status === "loaned" && (
              <div ref={loanSectionRef}>
                <EquipmentDialogSection
                  title="Loan details"
                  description="Who currently has this trap. A borrower name is required."
                  open={openSections.loan}
                  onOpenChange={(open) => setSectionOpen("loan", open)}
                  accent
                  className="border-primary/40 bg-primary/5 shadow-sm shadow-primary/5"
                  headerClassName="hover:bg-primary/10"
                >
                  <div className="space-y-2">
                    <Label htmlFor="borrower-name">
                      Borrower name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="borrower-name"
                      placeholder="Borrower full name"
                      value={form.borrower_name}
                      required
                      onChange={(e) => setForm({ ...form, borrower_name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="borrower-phone">Phone (optional)</Label>
                      <Input
                        id="borrower-phone"
                        type="tel"
                        placeholder="(555) 555-5555"
                        value={form.borrower_phone}
                        onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="borrower-email">Email (optional)</Label>
                      <Input
                        id="borrower-email"
                        type="email"
                        placeholder="name@example.com"
                        value={form.borrower_email}
                        onChange={(e) => setForm({ ...form, borrower_email: e.target.value })}
                      />
                    </div>
                  </div>
                </EquipmentDialogSection>
              </div>
            )}

            <EquipmentDialogSection
              title="Trap information"
              description={
                editing
                  ? "Type, label, and QR code stay with this trap. Delete the item if they were logged wrong."
                  : "Identify the equipment and optional QR or physical label. These stay fixed after you save."
              }
              open={openSections.trap}
              onOpenChange={(open) => setSectionOpen("trap", open)}
            >
              {editing ? (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="font-medium">{equipmentTypeLabel(form.equipment_type)}</dd>
                  </div>
                  {form.is_labeled && form.equipment_label.trim() ? (
                    <div>
                      <dt className="text-muted-foreground">Label</dt>
                      <dd className="font-medium">{form.equipment_label}</dd>
                    </div>
                  ) : null}
                  {form.description.trim() ? (
                    <div>
                      <dt className="text-muted-foreground">Description</dt>
                      <dd className="font-medium">{form.description}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted-foreground">QR code</dt>
                    <dd className="font-medium">{form.qr_code_data ? "On file" : "None"}</dd>
                  </div>
                </dl>
              ) : (
              <>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setScannerPurpose("identify");
                    setScannerOpen(true);
                  }}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan QR Code
                </Button>
              </div>
              {scanNotice && (
                <p className="text-sm text-primary bg-primary/10 rounded-md px-3 py-2">{scanNotice}</p>
              )}

              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="equipment-labeled"
                    checked={form.is_labeled}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        is_labeled: !!checked,
                        equipment_label: checked ? form.equipment_label : "",
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
                        setForm({ ...form, equipment_label: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Equipment type</Label>
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

              {form.equipment_type === "other" ? (
                <div className="space-y-2">
                  <Label>What is this item?</Label>
                  <Input
                    placeholder="e.g. Net, carrier, scale"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="e.g. Large Tomahawk, brand/model"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              )}
              </>
              )}
            </EquipmentDialogSection>

            <EquipmentDialogSection
              title="Notes"
              description="Optional context for the next volunteer."
              open={openSections.notes}
              onOpenChange={(open) => setSectionOpen("notes", open)}
            >
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Condition, pickup instructions, etc."
              />
            </EquipmentDialogSection>

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
