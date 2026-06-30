"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Mail, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { CommunityPartnerImporter } from "@/components/community-partners/partner-importer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMUNITY_PARTNER_ORGANIZATION_TYPES,
  COMMUNITY_PARTNER_STATUSES,
  organizationTypeLabel,
  partnershipStatusLabel,
} from "@/lib/community-partners/constants";
import {
  exportPartnerEmailsCsv,
  exportPartnerEmailsPlain,
  exportPartnersCsv,
} from "@/lib/community-partners/export-csv";
import { formatSingleLineAddress } from "@/lib/cases/colony-notes";
import type {
  CommunityPartner,
  CommunityPartnerOrganizationType,
  CommunityPartnerStatus,
} from "@/lib/types";

interface CommunityPartnersManagerProps {
  partners: CommunityPartner[];
}

const emptyPartner = {
  name: "",
  organization_type: "other" as CommunityPartnerOrganizationType,
  website: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  contact_name: "",
  contact_title: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
  partnership_status: "active" as CommunityPartnerStatus,
  is_active: true,
};

function matchesSearch(partner: CommunityPartner, query: string): boolean {
  const haystack = [
    partner.name,
    partner.organization_type,
    organizationTypeLabel(partner.organization_type),
    partnershipStatusLabel(partner.partnership_status),
    partner.website,
    partner.address,
    partner.city,
    partner.state,
    partner.zip,
    partner.phone,
    partner.email,
    partner.contact_name,
    partner.contact_title,
    partner.contact_email,
    partner.contact_phone,
    partner.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function partnerAddress(partner: CommunityPartner): string {
  return (
    formatSingleLineAddress([partner.address, partner.city, partner.state, partner.zip]) ?? "—"
  );
}

export function CommunityPartnersManager({ partners: initial }: CommunityPartnersManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityPartner | null>(null);
  const [form, setForm] = useState(emptyPartner);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommunityPartner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return initial.filter((partner) => {
      if (typeFilter !== "all" && partner.organization_type !== typeFilter) return false;
      if (!query) return true;
      return matchesSearch(partner, query);
    });
  }, [initial, search, typeFilter]);

  function openNew() {
    setEditing(null);
    setForm(emptyPartner);
    setSaveError(null);
    setDialogOpen(true);
  }

  function openEdit(partner: CommunityPartner) {
    setEditing(partner);
    setForm({
      name: partner.name,
      organization_type: partner.organization_type,
      website: partner.website ?? "",
      address: partner.address ?? "",
      city: partner.city ?? "",
      state: partner.state ?? "",
      zip: partner.zip ?? "",
      phone: partner.phone ?? "",
      email: partner.email ?? "",
      contact_name: partner.contact_name ?? "",
      contact_title: partner.contact_title ?? "",
      contact_email: partner.contact_email ?? "",
      contact_phone: partner.contact_phone ?? "",
      notes: partner.notes ?? "",
      partnership_status: partner.partnership_status,
      is_active: partner.is_active,
    });
    setSaveError(null);
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);

    const response = await fetch("/api/community-partners/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: editing?.id }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to save partner");
      return;
    }

    setDialogOpen(false);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const response = await fetch("/api/community-partners/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteTarget.id }),
    });
    setDeleting(false);

    if (response.ok) {
      setDeleteTarget(null);
      router.refresh();
    }
  }

  const columns = useMemo((): DataTableColumn<CommunityPartner>[] => {
    return [
      {
        id: "organization",
        label: "Organization",
        defaultWidth: 220,
        wrap: true,
        render: (partner) => (
          <div>
            <p className="font-medium">{partner.name}</p>
            <p className="text-sm text-muted-foreground">{partnerAddress(partner)}</p>
          </div>
        ),
      },
      {
        id: "type",
        label: "Type",
        defaultWidth: 150,
        wrap: true,
        render: (partner) => organizationTypeLabel(partner.organization_type),
      },
      {
        id: "contact",
        label: "Primary contact",
        defaultWidth: 200,
        wrap: true,
        render: (partner) =>
          partner.contact_name || partner.contact_email ? (
            <div className="text-sm">
              {partner.contact_name && <p className="font-medium">{partner.contact_name}</p>}
              {partner.contact_title && (
                <p className="text-muted-foreground">{partner.contact_title}</p>
              )}
              {partner.contact_email && (
                <a
                  href={`mailto:${partner.contact_email}`}
                  className="text-primary hover:underline"
                >
                  {partner.contact_email}
                </a>
              )}
            </div>
          ) : (
            "—"
          ),
      },
      {
        id: "phones",
        label: "Phone",
        defaultWidth: 130,
        render: (partner) => {
          const phone = partner.contact_phone || partner.phone;
          return phone ? (
            <a href={`tel:${phone}`} className="whitespace-nowrap text-primary hover:underline">
              {phone}
            </a>
          ) : (
            "—"
          );
        },
      },
      {
        id: "status",
        label: "Status",
        defaultWidth: 120,
        render: (partner) => (
          <Badge
            variant={
              partner.partnership_status === "do_not_contact"
                ? "destructive"
                : partner.partnership_status === "active"
                  ? "default"
                  : "secondary"
            }
          >
            {partnershipStatusLabel(partner.partnership_status)}
          </Badge>
        ),
      },
      {
        id: "actions",
        label: "",
        defaultWidth: 90,
        render: (partner) => (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(partner)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(partner)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search partners, contacts, notes…"
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {COMMUNITY_PARTNER_ORGANIZATION_TYPES.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportPartnersCsv(filtered)}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPartnerEmailsCsv(filtered)}>
            <Mail className="mr-2 h-4 w-4" />
            Export emails
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPartnerEmailsPlain(filtered)}>
            Copy list (.txt)
          </Button>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add partner
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {initial.length} community partners
      </p>

      <DataTable
        tableId="community-partners"
        columns={columns}
        rows={filtered}
        getRowKey={(partner) => partner.id}
        emptyMessage="No community partners match your search."
        minTableWidth={980}
      />

      <CommunityPartnerImporter />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit partner" : "Add partner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Organization type</Label>
                <Select
                  value={form.organization_type}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      organization_type: value as CommunityPartnerOrganizationType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_PARTNER_ORGANIZATION_TYPES.map((entry) => (
                      <SelectItem key={entry.value} value={entry.value}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Partnership status</Label>
                <Select
                  value={form.partnership_status}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      partnership_status: value as CommunityPartnerStatus,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_PARTNER_STATUSES.map((entry) => (
                      <SelectItem key={entry.value} value={entry.value}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(event) => setForm({ ...form, website: event.target.value })}
                placeholder="https://"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={form.state}
                  onChange={(event) => setForm({ ...form, state: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input
                  value={form.zip}
                  onChange={(event) => setForm({ ...form, zip: event.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Organization phone</Label>
                <Input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Organization email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <p className="text-sm font-medium">Primary contact</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contact name</Label>
                  <Input
                    value={form.contact_name}
                    onChange={(event) => setForm({ ...form, contact_name: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title / role</Label>
                  <Input
                    value={form.contact_title}
                    onChange={(event) => setForm({ ...form, contact_title: event.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contact email</Label>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={(event) => setForm({ ...form, contact_email: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact phone</Label>
                  <Input
                    value={form.contact_phone}
                    onChange={(event) => setForm({ ...form, contact_phone: event.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Partnership history, preferences, how you work together…"
                rows={4}
              />
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <Button onClick={save} className="w-full" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add partner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove community partner?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently remove ${deleteTarget.name} and its contact information from the directory.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Removing..." : "Remove partner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
