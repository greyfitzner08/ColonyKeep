"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventPricingEditor } from "@/components/clinics/event-pricing-editor";
import { ServiceCatalogEditor } from "@/components/clinics/service-catalog-editor";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { countOccupiedSpots } from "@/lib/clinic-events/availability";
import { eventBookingStatusLabel } from "@/lib/clinic-events/visibility";
import {
  normalizePricingMatrix,
  normalizePricingMode,
  pricingSummaryLabel,
} from "@/lib/clinics/event-pricing";
import {
  defaultIncludedCatalog,
  normalizeServiceCatalog,
} from "@/lib/clinics/service-catalog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  Clinic,
  ClinicEventPricingMode,
  ClinicEventPricingTier,
  ClinicServiceOption,
  PublicClinicEvent,
  PublicBooking,
} from "@/lib/types";
import { Copy, Link2, Pencil, Plus, X } from "lucide-react";

type ClinicOption = Pick<Clinic, "id" | "name" | "service_catalog" | "included_services" | "addon_services">;

interface ClinicEventsManagerProps {
  events: PublicClinicEvent[];
  clinics: ClinicOption[];
  bookings: PublicBooking[];
}

interface EventForm {
  clinic_id: string;
  title: string;
  date: string;
  location: string;
  total_spots: number;
  description: string;
  base_price: number;
  pricing_mode: ClinicEventPricingMode;
  pricing_matrix: ClinicEventPricingTier[];
  payment_url: string;
  service_catalog: ClinicServiceOption[];
  pending_email_message: string;
  confirmed_email_message: string;
  is_active: boolean;
  notes: string;
}

const emptyForm = (): EventForm => ({
  clinic_id: "",
  title: "",
  date: "",
  location: "",
  total_spots: 20,
  description: "",
  base_price: 0,
  pricing_mode: "flat",
  pricing_matrix: [],
  payment_url: "",
  service_catalog: defaultIncludedCatalog(),
  pending_email_message: "",
  confirmed_email_message: "",
  is_active: true,
  notes: "",
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  waitlist: "outline",
  cancelled: "destructive",
  expired: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  waitlist: "waiting list",
};

function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status;
}

const STATUS_SORT_ORDER: Record<string, number> = {
  pending: 0,
  waitlist: 1,
  confirmed: 2,
  cancelled: 3,
  expired: 4,
};

function bookingSearchText(booking: PublicBooking) {
  return [
    booking.contact_name,
    booking.contact_email,
    booking.contact_phone,
    booking.cat_name,
    booking.cat_colors,
    booking.cat_gender,
    booking.notes,
    booking.injury_details,
    booking.selected_addons.join(" "),
    statusLabel(booking.status),
  ]
    .filter(Boolean)
    .join(" ");
}

export function ClinicEventsManager({ events, clinics, bookings }: ClinicEventsManagerProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<PublicClinicEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [emailsCopied, setEmailsCopied] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  function catalogForClinic(clinicId: string): ClinicServiceOption[] {
    const clinic = clinics.find((c) => c.id === clinicId);
    if (!clinic) return defaultIncludedCatalog();
    return normalizeServiceCatalog(clinic.service_catalog, clinic.included_services, clinic.addon_services);
  }

  function resetForm() {
    setForm(emptyForm());
    setError(null);
  }

  function handleClinicChange(clinicId: string) {
    setForm({
      ...form,
      clinic_id: clinicId,
      service_catalog: catalogForClinic(clinicId),
    });
  }

  async function createEvent() {
    const clinic = clinics.find((c) => c.id === form.clinic_id);
    if (!clinic) {
      setError("Select a clinic before creating an event.");
      return;
    }
    setError(null);
    setSaving(true);
    const response = await fetch("/api/clinic-events/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        clinic_id: form.clinic_id,
        clinic_name: clinic.name,
        pending_email_message: form.pending_email_message || null,
        confirmed_email_message: form.confirmed_email_message || null,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to create clinic event");
      return;
    }

    setCreateOpen(false);
    resetForm();
    router.refresh();
  }

  function openEdit(event: PublicClinicEvent) {
    setEditingEvent(event);
    setForm({
      clinic_id: event.clinic_id,
      title: event.title,
      date: event.date,
      location: event.location,
      total_spots: event.total_spots,
      description: event.description ?? "",
      base_price: event.base_price,
      pricing_mode: normalizePricingMode(event.pricing_mode),
      pricing_matrix: normalizePricingMatrix(event.pricing_matrix),
      payment_url: event.payment_url ?? "",
      service_catalog: normalizeServiceCatalog(
        event.service_catalog,
        event.included_services,
        event.addon_services
      ),
      pending_email_message: event.pending_email_message ?? "",
      confirmed_email_message: event.confirmed_email_message ?? "",
      is_active: event.is_active,
      notes: event.notes ?? "",
    });
    setError(null);
    setEditOpen(true);
  }

  async function updateEvent() {
    if (!editingEvent) return;
    const clinic = clinics.find((c) => c.id === form.clinic_id);
    if (!clinic) {
      setError("Select a clinic.");
      return;
    }

    setError(null);
    setSaving(true);
    const response = await fetch("/api/clinic-events/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingEvent.id,
        ...form,
        clinic_id: form.clinic_id,
        clinic_name: clinic.name,
        pending_email_message: form.pending_email_message || null,
        confirmed_email_message: form.confirmed_email_message || null,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to update clinic event");
      return;
    }

    setEditOpen(false);
    setEditingEvent(null);
    resetForm();
    router.refresh();
  }

  function copyShareLink(eventId: string) {
    const url = `${window.location.origin}/clinic-booking?event=${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(eventId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function copyAllEmails(bookingList: PublicBooking[]) {
    const emails = [...new Set(bookingList.map((b) => b.contact_email.trim().toLowerCase()))]
      .filter((email) => email && email !== "hold@pending.local")
      .join(", ");
    navigator.clipboard.writeText(emails).then(() => {
      setEmailsCopied(true);
      setTimeout(() => setEmailsCopied(false), 2000);
    });
  }

  async function updateBookingStatus(bookingId: string, status: PublicBooking["status"]) {
    setUpdatingBookingId(bookingId);
    setError(null);
    const response = await fetch("/api/clinic-events/bookings/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, status }),
    });
    const result = await response.json().catch(() => null);
    setUpdatingBookingId(null);
    if (!response.ok) {
      setError(result?.error ?? "Unable to update booking");
      return;
    }
    router.refresh();
  }

  async function toggleAddonPayment(bookingId: string, addonName: string, paid: boolean) {
    setUpdatingBookingId(bookingId);
    const response = await fetch("/api/clinic-events/bookings/update-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, addon_name: addonName, paid }),
    });
    setUpdatingBookingId(null);
    if (response.ok) router.refresh();
  }

  const selectedEventData = events.find((e) => e.id === selectedEvent);
  const allEventBookings = useMemo(() => {
    if (!selectedEvent) return [];
    return bookings.filter((b) => b.event_id === selectedEvent && b.contact_email !== "hold@pending.local");
  }, [bookings, selectedEvent]);

  const bookingColumns = useMemo((): DataTableColumn<PublicBooking>[] => [
    {
      id: "cat",
      label: "Cat",
      wrap: true,
      sortValue: (booking) => booking.cat_name ?? "",
      render: (booking) => (
        <div>
          <p className="font-medium">{booking.cat_name ?? "Unnamed cat"}</p>
          {(booking.cat_colors || booking.cat_gender) && (
            <p className="text-xs text-muted-foreground">
              {[booking.cat_colors, booking.cat_gender].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "person",
      label: "Person",
      wrap: true,
      sortValue: (booking) => booking.contact_name,
      render: (booking) => <p className="font-medium">{booking.contact_name}</p>,
    },
    {
      id: "email",
      label: "Email",
      wrap: true,
      sortValue: (booking) => booking.contact_email,
      render: (booking) => (
        <a href={`mailto:${booking.contact_email}`} className="text-primary hover:underline">
          {booking.contact_email}
        </a>
      ),
    },
    {
      id: "phone",
      label: "Phone",
      sortValue: (booking) => booking.contact_phone,
      render: (booking) =>
        booking.contact_phone ? (
          <a href={`tel:${booking.contact_phone}`} className="whitespace-nowrap text-primary hover:underline">
            {booking.contact_phone}
          </a>
        ) : (
          "—"
        ),
    },
    {
      id: "status",
      label: "Status",
      sortValue: (booking) => STATUS_SORT_ORDER[booking.status] ?? 99,
      render: (booking) => (
        <Badge variant={STATUS_VARIANT[booking.status] ?? "secondary"}>{statusLabel(booking.status)}</Badge>
      ),
    },
    {
      id: "total",
      label: "Total",
      sortValue: (booking) => booking.total_price,
      render: (booking) => formatCurrency(booking.total_price),
    },
    {
      id: "notes",
      label: "Notes",
      wrap: true,
      sortValue: (booking) => booking.notes ?? booking.injury_details ?? "",
      render: (booking) => (
        <p className="max-w-xs text-muted-foreground">
          {booking.notes || booking.injury_details || "—"}
        </p>
      ),
    },
    {
      id: "addons",
      label: "Add-ons",
      wrap: true,
      sortValue: (booking) => booking.selected_addons.join(" "),
      render: (booking) =>
        booking.selected_addons.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="space-y-1">
            {booking.selected_addons.map((addon) => {
              const paid = booking.addon_payments?.[addon] ?? false;
              return (
                <div key={addon} className="flex items-center gap-2">
                  <Checkbox
                    checked={paid}
                    disabled={updatingBookingId === booking.id}
                    onCheckedChange={(checked) => toggleAddonPayment(booking.id, addon, !!checked)}
                  />
                  <Label className="font-normal">
                    {addon} {paid ? "· Paid" : "· Unpaid"}
                  </Label>
                </div>
              );
            })}
          </div>
        ),
    },
    {
      id: "actions",
      label: "Actions",
      wrap: true,
      render: (booking) => (
        <BookingActions
          booking={booking}
          updatingId={updatingBookingId}
          onConfirm={(id) => updateBookingStatus(id, "confirmed")}
          onWaitlist={(id) => updateBookingStatus(id, "waitlist")}
          onCancel={(id) => updateBookingStatus(id, "cancelled")}
        />
      ),
    },
  ], [updatingBookingId, toggleAddonPayment, updateBookingStatus]);

  const formFields = (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Clinic</Label>
        <Select value={form.clinic_id} onValueChange={handleClinicChange}>
          <SelectTrigger><SelectValue placeholder="Select clinic" /></SelectTrigger>
          <SelectContent>
            {clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Selecting a clinic loads its service catalog — you can customize below.</p>
      </div>
      <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
      <div className="space-y-1"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
      <div className="space-y-1">
        <Label>Total Spots</Label>
        <NumberInput
          integer
          min={0}
          value={form.total_spots}
          onValueChange={(value) => {
            if (typeof value === "number") setForm({ ...form, total_spots: value });
          }}
        />
      </div>
      <EventPricingEditor
        value={{
          pricing_mode: form.pricing_mode,
          base_price: form.base_price,
          pricing_matrix: form.pricing_matrix,
        }}
        onChange={(pricing) => setForm({ ...form, ...pricing })}
      />
      <ServiceCatalogEditor
        value={form.service_catalog}
        onChange={(service_catalog) => setForm({ ...form, service_catalog })}
      />
      <div className="space-y-1"><Label>Payment URL</Label><Input value={form.payment_url} onChange={(e) => setForm({ ...form, payment_url: e.target.value })} /></div>
      <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="space-y-1">
        <Label>After-signup message (shown on the confirmation screen)</Label>
        <Textarea
          value={form.pending_email_message}
          onChange={(e) => setForm({ ...form, pending_email_message: e.target.value })}
          rows={3}
        />
      </div>
      <div className="space-y-1">
        <Label>Notes for when you email confirmations by hand</Label>
        <Textarea
          value={form.confirmed_email_message}
          onChange={(e) => setForm({ ...form, confirmed_email_message: e.target.value })}
          rows={3}
        />
      </div>
      <div className="space-y-1"><Label>Internal notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="event-active"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
        />
        <Label htmlFor="event-active">Active (open for public booking — deactivate when signups should close)</Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
        <Plus className="h-4 w-4 mr-2" />Create Event
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => {
          const eventRows = bookings.filter((b) => b.event_id === event.id);
          const occupied = countOccupiedSpots(eventRows);
          const remaining = Math.max(0, event.total_spots - occupied);
          const bookingStatus = eventBookingStatusLabel(event);
          return (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="cursor-pointer flex-1" onClick={() => setSelectedEvent(event.id)}>
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{event.clinic_name}</p>
                  </div>
                  <Badge variant={bookingStatus.variant}>
                    {bookingStatus.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="cursor-pointer" onClick={() => setSelectedEvent(event.id)}>
                  <p>{formatDate(event.date)} · {event.location}</p>
                  <p>
                    {occupied}/{event.total_spots} taken · {remaining} left ·{" "}
                    {pricingSummaryLabel(event)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedEvent === event.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedEvent(event.id)}
                  >
                    Manage bookings
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(event)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyShareLink(event.id)}>
                    {copiedId === event.id ? "Copied!" : (<><Link2 className="h-3.5 w-3.5 mr-1" />Share link</>)}
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/clinic-booking?event=${event.id}`} target="_blank" rel="noopener noreferrer">
                      Preview
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedEvent && selectedEventData && (
        <Card>
          <CardHeader>
            <div className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Manage bookings — {selectedEventData.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Click a column header to sort. Confirm to approve a spot, waitlist if full, or cancel to release it.
                  Emails are sent by the team by hand — copy addresses below.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {allEventBookings.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => copyAllEmails(allEventBookings)}>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {emailsCopied ? "Copied!" : "Copy all emails"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                  <X className="h-4 w-4 mr-1" />
                  Hide
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DataTable
              tableId={`clinic-event-bookings-${selectedEvent}`}
              columns={bookingColumns}
              rows={allEventBookings}
              getRowKey={(booking) => booking.id}
              getSearchText={bookingSearchText}
              searchPlaceholder="Find a person or cat…"
              emptyMessage="No bookings yet"
              noSearchMatchMessage="No bookings match that search"
              defaultSort={{ columnId: "cat", direction: "asc" }}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader><DialogTitle>Create Clinic Event</DialogTitle></DialogHeader>
          {formFields}
          <Button onClick={createEvent} className="w-full" disabled={saving}>
            {saving ? "Creating..." : "Create Event"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader><DialogTitle>Edit Clinic Event</DialogTitle></DialogHeader>
          {formFields}
          <Button onClick={updateEvent} className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookingActions({
  booking,
  updatingId,
  onConfirm,
  onWaitlist,
  onCancel,
}: {
  booking: PublicBooking;
  updatingId: string | null;
  onConfirm: (id: string) => void;
  onWaitlist: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const busy = updatingId === booking.id;
  const showConfirm = booking.status === "pending" || booking.status === "waitlist";
  const showWaitlist = booking.status === "pending" || booking.status === "cancelled";
  const showCancel = booking.status === "pending" || booking.status === "confirmed" || booking.status === "waitlist";

  if (!showConfirm && !showWaitlist && !showCancel) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {showConfirm && (
        <Button size="sm" disabled={busy} onClick={() => onConfirm(booking.id)}>
          Confirm
        </Button>
      )}
      {showWaitlist && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onWaitlist(booking.id)}>
          Waiting list
        </Button>
      )}
      {showCancel && (
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => onCancel(booking.id)}>
          Cancel
        </Button>
      )}
    </div>
  );
}
