"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { CommunityPartnerImporter } from "@/components/community-partners/partner-importer";
import { PartnerContactsEditor } from "@/components/community-partners/partner-contacts-editor";
import { PartnerValueList } from "@/components/community-partners/partner-value-list";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import { CollapsibleModalCard } from "@/components/layout/modal-sections";
import { ControlSearch, PageControlBar } from "@/components/layout/page-control-bar";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  GCAA_MEMBER_STATUSES,
  gcaaMemberBadgeVariant,
  gcaaMemberIsActive,
  gcaaMemberStatusLabel,
  isGcaaPartner,
  organizationTypeLabel,
  partnershipStatusLabel,
  partnerWebsiteHref,
  resolvedGcaaMemberStatus,
} from "@/lib/community-partners/constants";
import {
  contactsFromPartner,
  emptyPartnerContactInput,
  formListFromValues,
  normalizePartnerEmails,
  normalizePartnerPhones,
  partnerEmailList,
  partnerHasContactDetails,
  partnerPhoneList,
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
  GcaaMemberStatus,
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
  emails: string[];
  phones: string[];
  notes: string;
  partnership_status: CommunityPartnerStatus;
  gcaa_member_status: GcaaMemberStatus;
  is_active: boolean;
  contacts: PartnerContactInput[];
};

const emptyPartner = (
  organizationType: CommunityPartnerOrganizationType = "other"
): PartnerForm => ({
  name: "",
  organization_type: organizationType,
  website: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  emails: [""],
  phones: [""],
  notes: "",
  partnership_status: "active",
  gcaa_member_status: "active",
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
    isGcaaPartner(partner.organization_type)
      ? gcaaMemberStatusLabel(resolvedGcaaMemberStatus(partner))
      : "",
    partner.website,
    partner.address,
    partner.city,
    partner.state,
    partner.zip,
    partner.phone,
    partner.email,
    ...(partner.phones ?? []),
    ...(partner.emails ?? []),
    partner.notes,
    ...contactFields,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

/** Unique emails from filtered partners (org + contacts), skipping do-not-contact rows. */
function uniquePartnerEmails(partners: CommunityPartner[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];

  function add(raw: string | null | undefined) {
    const trimmed = raw?.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    emails.push(trimmed);
  }

  for (const partner of partners) {
    if (partner.partnership_status === "do_not_contact") continue;
    if (isGcaaPartner(partner.organization_type)) {
      if (!gcaaMemberIsActive(resolvedGcaaMemberStatus(partner))) continue;
    } else if (!partner.is_active) {
      continue;
    }
    for (const email of partnerEmailList(partner)) add(email);
    for (const contact of partner.contacts ?? []) {
      add(contact.email);
    }
  }

  return emails;
}

function partnerAddress(partner: CommunityPartner): string {
  return (
    formatSingleLineAddress([partner.address, partner.city, partner.state, partner.zip]) ?? "—"
  );
}

function joinSummary(parts: Array<string | null | undefined>, empty: string): string {
  const values = parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  return values.length > 0 ? values.join(" · ") : empty;
}

function facilitySummary(partner: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  website?: string | null;
}): string {
  return joinSummary(
    [
      formatSingleLineAddress([partner.address, partner.city, partner.state, partner.zip]),
      partner.website,
    ],
    "Address & website"
  );
}

function contactSummary(partner: {
  emails: string[];
  phones: string[];
  contacts: Array<{ name?: string | null; email?: string | null; phone?: string | null }>;
}): string {
  const emails = normalizePartnerEmails(partner.emails);
  const phones = normalizePartnerPhones(partner.phones);
  const people = partner.contacts.filter(partnerHasContactDetails);
  return joinSummary(
    [
      emails[0],
      phones[0],
      people.length > 0 ? `${people.length} ${people.length === 1 ? "person" : "people"}` : "",
    ],
    "Emails, phones & people"
  );
}

function notesSummary(notes: string | null | undefined): string {
  const firstLine = notes?.trim().split("\n")[0] ?? "";
  return firstLine || "Notes";
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
  const isGcaa = isGcaaPartner(partner.organization_type);
  const emails = partnerEmailList(partner);
  const phones = partnerPhoneList(partner);
  const address = formatSingleLineAddress([
    partner.address,
    partner.city,
    partner.state,
    partner.zip,
  ]);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {isGcaa ? (
          <Badge variant={gcaaMemberBadgeVariant(resolvedGcaaMemberStatus(partner))}>
            {gcaaMemberStatusLabel(resolvedGcaaMemberStatus(partner))}
          </Badge>
        ) : (
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
        )}
        <Badge variant="outline">{organizationTypeLabel(partner.organization_type)}</Badge>
        {!isGcaa && !partner.is_active && <Badge variant="secondary">Inactive</Badge>}
      </div>

      <CollapsibleModalCard
        title="Facility"
        summary={facilitySummary(partner)}
      >
        <div className="space-y-3">
          <DetailBlock label="Address" value={address} />
          {partner.website?.trim() ? (
            <div>
              <p className="font-medium">Website</p>
              <a
                href={partnerWebsiteHref(partner.website)}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline break-all"
              >
                {partner.website}
              </a>
            </div>
          ) : null}
          {!address && !partner.website?.trim() ? (
            <p className="text-muted-foreground">No facility details on file.</p>
          ) : null}
        </div>
      </CollapsibleModalCard>

      <CollapsibleModalCard
        title="Contact info"
        summary={contactSummary({
          emails,
          phones,
          contacts,
        })}
      >
        <div className="space-y-3">
          {phones.length > 0 ? (
            <div>
              <p className="font-medium">Phone numbers</p>
              {phones.map((phone) => (
                <a key={phone} href={`tel:${phone}`} className="block text-primary hover:underline">
                  {phone}
                </a>
              ))}
            </div>
          ) : null}
          {emails.length > 0 ? (
            <div>
              <p className="font-medium">Email addresses</p>
              {emails.map((email) => (
                <a
                  key={email}
                  href={`mailto:${email}`}
                  className="block text-primary hover:underline break-all"
                >
                  {email}
                </a>
              ))}
            </div>
          ) : null}
          <div className="space-y-3">
            <p className="font-medium">{isGcaa ? "Points of contact" : "People"}</p>
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
                    <a
                      href={`mailto:${contact.email}`}
                      className="block text-primary hover:underline break-all"
                    >
                      {contact.email.trim()}
                    </a>
                  )}
                  {contact.phone?.trim() && (
                    <a href={`tel:${contact.phone}`} className="block text-primary hover:underline">
                      {contact.phone.trim()}
                    </a>
                  )}
                  {contact.notes?.trim() && (
                    <p className="text-muted-foreground whitespace-pre-wrap pt-1">
                      {contact.notes.trim()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CollapsibleModalCard>

      <CollapsibleModalCard title="Notes" summary={notesSummary(partner.notes)}>
        {partner.notes?.trim() ? (
          <p className="text-muted-foreground whitespace-pre-wrap">{partner.notes.trim()}</p>
        ) : (
          <p className="text-muted-foreground">No notes on file.</p>
        )}
      </CollapsibleModalCard>

      <Button type="button" variant="outline" className="w-full" onClick={onEdit}>
        <Pencil className="mr-2 h-4 w-4" />
        {isGcaa ? "Edit apartment community" : "Edit partner"}
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
  const [emailsCopied, setEmailsCopied] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return initial.filter((partner) => {
      if (typeFilter !== "all" && partner.organization_type !== typeFilter) return false;
      if (!query) return true;
      return matchesSearch(partner, query);
    });
  }, [initial, search, typeFilter]);

  const filteredEmails = useMemo(() => uniquePartnerEmails(filtered), [filtered]);
  const isGcaaForm = isGcaaPartner(form.organization_type);

  async function copyAllEmails() {
    if (filteredEmails.length === 0) return;
    try {
      await navigator.clipboard.writeText(filteredEmails.join("\n"));
      setEmailsCopied(true);
      window.setTimeout(() => setEmailsCopied(false), 2000);
    } catch {
      // Browser may block clipboard; leave button ready for another try.
    }
  }

  function openNew() {
    setEditing(null);
    setForm(
      emptyPartner(
        typeFilter !== "all" ? (typeFilter as CommunityPartnerOrganizationType) : "other"
      )
    );
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
      emails: formListFromValues(partner.emails, partner.email),
      phones: formListFromValues(partner.phones, partner.phone),
      notes: partner.notes ?? "",
      partnership_status: partner.partnership_status,
      gcaa_member_status: resolvedGcaaMemberStatus(partner),
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
      body: JSON.stringify({
        ...form,
        emails: normalizePartnerEmails(form.emails),
        phones: normalizePartnerPhones(form.phones),
        id: editing?.id,
      }),
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
        label: typeFilter === "gcaa" ? "Apartment community" : "Organization",
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
        defaultWidth: 150,
        wrap: true,
        render: (partner) => {
          const phones = partnerPhoneList(partner);
          const contactPhone = primaryPartnerContact(partner)?.phone;
          const values = phones.length > 0 ? phones : contactPhone ? [contactPhone] : [];
          if (values.length === 0) return "—";
          return (
            <div className="space-y-1">
              {values.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone}`}
                  className="block whitespace-nowrap text-primary hover:underline"
                >
                  {phone}
                </a>
              ))}
            </div>
          );
        },
      },
      {
        id: "status",
        label: typeFilter === "gcaa" ? "Member status" : "Status",
        defaultWidth: 120,
        render: (partner) => {
          if (isGcaaPartner(partner.organization_type)) {
            const status = resolvedGcaaMemberStatus(partner);
            return (
              <Badge variant={gcaaMemberBadgeVariant(status)}>
                {gcaaMemberStatusLabel(status)}
              </Badge>
            );
          }

          return (
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
          );
        },
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
  }, [typeFilter]);

  return (
    <div className="space-y-6">
      <PageControlBar
        activeFilterCount={typeFilter !== "all" ? 1 : 0}
        search={
          <ControlSearch
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search partners, apartment communities, contacts, notes…"
            aria-label="Search community partners"
          />
        }
        filters={
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[220px]">
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
        }
        primaryActions={
          <CommunityPartnerImporter
            exportCount={filtered.length}
            onExport={() => exportPartnersCsv(filtered)}
            copyCount={filteredEmails.length}
            copyCopied={emailsCopied}
            copyDisabled={filteredEmails.length === 0}
            onCopyEmails={() => void copyAllEmails()}
          >
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              {typeFilter === "gcaa" ? "Add apartment community" : "Add partner"}
            </Button>
          </CommunityPartnerImporter>
        }
        meta={
          <>
            Showing {filtered.length} of {initial.length} community partners
          </>
        }
      />

      <DataTable
        tableId="community-partners"
        columns={columns}
        rows={filtered}
        getRowKey={(partner) => partner.id}
        emptyMessage="No community partners match your search."
        minTableWidth={980}
        enableSearch={false}
      />

      <Dialog open={viewingPartner != null} onOpenChange={(open) => !open && setViewingPartner(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isGcaaForm
                ? editing
                  ? "Edit GCAA apartment community"
                  : "Add GCAA apartment community"
                : editing
                  ? "Edit partner"
                  : "Add partner"}
            </DialogTitle>
            <DialogDescription>
              {isGcaaForm
                ? "Keep apartment community details, contact info, and notes in one place."
                : "Keep facility details, contact info, and notes grouped so the record is easy to scan."}
            </DialogDescription>
          </DialogHeader>
          <div key={editing?.id ?? "new"} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="partner-name">
                {isGcaaForm ? "Apartment community name" : "Organization name"}
              </Label>
              <Input
                id="partner-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Organization type</Label>
                <Select
                  value={form.organization_type}
                  onValueChange={(value) => {
                    const organizationType = value as CommunityPartnerOrganizationType;
                    setForm({
                      ...form,
                      organization_type: organizationType,
                      is_active: isGcaaPartner(organizationType)
                        ? gcaaMemberIsActive(form.gcaa_member_status)
                        : form.is_active,
                    });
                  }}
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
              {isGcaaForm ? (
                <div className="space-y-1.5">
                  <Label>Member status</Label>
                  <Select
                    value={form.gcaa_member_status}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        gcaa_member_status: value as GcaaMemberStatus,
                        is_active: gcaaMemberIsActive(value as GcaaMemberStatus),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GCAA_MEMBER_STATUSES.map((entry) => (
                        <SelectItem key={entry.value} value={entry.value}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Is active</Label>
                  <Select
                    value={form.is_active ? "yes" : "no"}
                    onValueChange={(value) => setForm({ ...form, is_active: value === "yes" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {!isGcaaForm ? (
              <div className="space-y-1.5">
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
            ) : null}

            <CollapsibleModalCard title="Facility" summary={facilitySummary(form)}>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="partner-website">Website</Label>
                  <Input
                    id="partner-website"
                    value={form.website}
                    onChange={(event) => setForm({ ...form, website: event.target.value })}
                    placeholder="https://"
                  />
                </div>
                <AddressAutocomplete
                  label="Address"
                  defaultValue={form.address}
                  onAddressChange={(address) => setForm({ ...form, address })}
                  onSelect={(parts) =>
                    setForm({
                      ...form,
                      address: parts.address,
                      city: parts.city,
                      state: parts.state,
                      zip: parts.zip,
                    })
                  }
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input
                      value={form.city}
                      onChange={(event) => setForm({ ...form, city: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Input
                      value={form.state}
                      onChange={(event) => setForm({ ...form, state: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ZIP</Label>
                    <Input
                      value={form.zip}
                      onChange={(event) => setForm({ ...form, zip: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleModalCard>

            <CollapsibleModalCard
              title="Contact info"
              summary={contactSummary(form)}
              description={
                isGcaaForm
                  ? "Apartment community emails, phones, and points of contact."
                  : "Organization emails, phones, and people at this partner."
              }
            >
              <PartnerValueList
                label="Email addresses"
                values={form.emails}
                onChange={(emails) => setForm({ ...form, emails })}
                type="email"
                placeholder="name@example.com"
                addLabel="Add email"
              />
              <PartnerValueList
                label="Phone numbers"
                values={form.phones}
                onChange={(phones) => setForm({ ...form, phones })}
                type="tel"
                placeholder="(704) 555-0100"
                addLabel="Add phone"
              />
              <div className="border-t pt-3">
                <PartnerContactsEditor
                  contacts={form.contacts}
                  onChange={(contacts) => setForm({ ...form, contacts })}
                  title={isGcaaForm ? "Points of contact" : "People"}
                  addLabel={isGcaaForm ? "Add point of contact" : "Add person"}
                  embedded
                />
              </div>
            </CollapsibleModalCard>

            <CollapsibleModalCard title="Notes" summary={notesSummary(form.notes)}>
              <div className="space-y-1.5">
                <Label htmlFor="partner-notes">Notes</Label>
                <Textarea
                  id="partner-notes"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  placeholder={
                    isGcaaForm
                      ? "Gate codes, colony history, or how this community works with TNVR…"
                      : "Partnership history, preferences, how you work together…"
                  }
                  rows={4}
                />
              </div>
            </CollapsibleModalCard>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || !form.name.trim()}>
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : isGcaaForm
                      ? "Add apartment community"
                      : "Add partner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget && isGcaaPartner(deleteTarget.organization_type)
                ? "Remove GCAA apartment community?"
                : "Remove community partner?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently remove ${deleteTarget.name} and all of its contacts from the directory.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
