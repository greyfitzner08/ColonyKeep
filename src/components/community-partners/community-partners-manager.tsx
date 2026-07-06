"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { CommunityPartnerImporter } from "@/components/community-partners/partner-importer";
import { PartnerContactsEditor } from "@/components/community-partners/partner-contacts-editor";
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
  contactsFromPartner,
  emptyPartnerContactInput,
  primaryPartnerContact,
  sortPartnerContacts,
  type PartnerContactInput,
} from "@/lib/community-partners/contacts";
import { exportPartnersCsv } from "@/lib/community-partners/export-csv";
import { formatSingleLineAddress } from "@/lib/cases/colony-notes";
import type {
  CommunityPartner,
  CommunityPartnerOrganizationType,
  CommunityPartnerStatus,
} from "@/lib/types";

interface CommunityPartnersManagerProps {
  partners: CommunityPartner[];
}

type PartnerForm = {
  name: string;
  organization_type: CommunityPartnerOrganizationType;
  website: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  notes: string;
  partnership_status: CommunityPartnerStatus;
  is_active: boolean;
  contacts: PartnerContactInput[];
};

const emptyPartner = (): PartnerForm => ({
  name: "",
  organization_type: "other",
  website: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  notes: "",
  partnership_status: "active",
  is_active: true,
  contacts: [emptyPartnerContactInput()],
});

function matchesSearch(partner: CommunityPartner, query: string): boolean {
  const contactFields = (partner.contacts ?? []).flatMap((contact) => [
    contact.name,
    contact.title,
    contact.email,
    contact.phone,
    contact.notes,
  ]);

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
    partner.notes,
    ...contactFields,
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

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground whitespace-pre-wrap">{value.trim()}</p>
    </div>
  );
}

function PartnerDetailView({
  partner,
  onEdit,
}: {
  partner: CommunityPartner;
  onEdit: () => void;
}) {
  const contacts = sortPartnerContacts(partner.contacts ?? []);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
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
        <Badge variant="outline">{organizationTypeLabel(partner.organization_type)}</Badge>
        {!partner.is_active && <Badge variant="secondary">Inactive</Badge>}
      </div>

      <div className="space-y-3">
        {formatSingleLineAddress([partner.address, partner.city, partner.state, partner.zip]) && (
          <DetailBlock
            label="Address"
            value={formatSingleLineAddress([
              partner.address,
              partner.city,
              partner.state,
              partner.zip,
            ])}
          />
        )}
        {partner.website?.trim() && (
          <div>
            <p className="font-medium">Website</p>
            <a
              href={partner.website}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline break-all"
            >
              {partner.website}
            </a>
          </div>
        )}
        {partner.phone?.trim() && (
          <div>
            <p className="font-medium">Organization phone</p>
            <a href={`tel:${partner.phone}`} className="text-primary hover:underline">
              {partner.phone}
            </a>
          </div>
        )}
        {partner.email?.trim() && (
          <div>
            <p className="font-medium">Organization email</p>
            <a href={`mailto:${partner.email}`} className="text-primary hover:underline break-all">
              {partner.email}
            </a>
          </div>
        )}
        <DetailBlock label="Organization notes" value={partner.notes} />
      </div>

      <div className="space-y-3">
        <p className="font-medium">Contacts</p>
        {contacts.length === 0 ? (
          <p className="text-muted-foreground">No contacts on file.</p>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{contact.name?.trim() || "Unnamed contact"}</p>
                {contact.is_primary && contacts.length > 1 ? (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Primary
                  </Badge>
                ) : null}
              </div>
              {contact.title?.trim() && (
                <p className="text-muted-foreground">{contact.title.trim()}</p>
              )}
              {contact.email?.trim() && (
                <a href={`mailto:${contact.email}`} className="block text-primary hover:underline break-all">
                  {contact.email.trim()}
                </a>
              )}
              {contact.phone?.trim() && (
                <a href={`tel:${contact.phone}`} className="block text-primary hover:underline">
                  {contact.phone.trim()}
                </a>
              )}
              {contact.notes?.trim() && (
                <p className="text-muted-foreground whitespace-pre-wrap pt-1">{contact.notes.trim()}</p>
              )}
            </div>
          ))
        )}
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={onEdit}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit partner
      </Button>
    </div>
  );
}

export function CommunityPartnersManager({ partners: initial }: CommunityPartnersManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityPartner | null>(null);
  const [form, setForm] = useState<PartnerForm>(emptyPartner());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommunityPartner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingPartner, setViewingPartner] = useState<CommunityPartner | null>(null);

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
    setForm(emptyPartner());
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
      notes: partner.notes ?? "",
      partnership_status: partner.partnership_status,
      is_active: partner.is_active,
      contacts: contactsFromPartner(partner),
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
        sortValue: (partner) => partner.name,
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
        sortValue: (partner) => organizationTypeLabel(partner.organization_type),
        render: (partner) => organizationTypeLabel(partner.organization_type),
      },
      {
        id: "contact",
        label: "Contacts",
        defaultWidth: 220,
        wrap: true,
        render: (partner) => {
          const contacts = sortPartnerContacts(partner.contacts ?? []);
          const primary = primaryPartnerContact(partner);

          if (contacts.length === 0) {
            return "—";
          }

          return (
            <div className="space-y-2 text-sm">
              {primary && (
                <div>
                  <p className="font-medium">
                    {primary.name || "Primary contact"}
                    {primary.is_primary && contacts.length > 1 ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">(primary)</span>
                    ) : null}
                  </p>
                  {primary.title && <p className="text-muted-foreground">{primary.title}</p>}
                  {primary.email && (
                    <a href={`mailto:${primary.email}`} className="text-primary hover:underline">
                      {primary.email}
                    </a>
                  )}
                </div>
              )}
              {contacts.length > 1 && (
                <p className="text-xs text-muted-foreground">+{contacts.length - 1} more contact(s)</p>
              )}
            </div>
          );
        },
      },
      {
        id: "phones",
        label: "Phone",
        defaultWidth: 130,
        render: (partner) => {
          const phone = primaryPartnerContact(partner)?.phone || partner.phone;
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
        defaultWidth: 120,
        render: (partner) => (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setViewingPartner(partner)}
              aria-label={`View ${partner.name}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => openEdit(partner)}
              aria-label={`Edit ${partner.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(partner)}
              aria-label={`Remove ${partner.name}`}
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

      <Dialog open={viewingPartner != null} onOpenChange={(open) => !open && setViewingPartner(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewingPartner && (
            <>
              <DialogHeader>
                <DialogTitle>{viewingPartner.name}</DialogTitle>
              </DialogHeader>
              <PartnerDetailView
                partner={viewingPartner}
                onEdit={() => {
                  const partner = viewingPartner;
                  setViewingPartner(null);
                  openEdit(partner);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

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

            <PartnerContactsEditor
              contacts={form.contacts}
              onChange={(contacts) => setForm({ ...form, contacts })}
            />

            <div className="space-y-2">
              <Label>Organization notes</Label>
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
                ? `This will permanently remove ${deleteTarget.name} and all of its contacts from the directory.`
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
