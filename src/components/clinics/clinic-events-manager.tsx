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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceCatalogEditor } from "@/components/clinics/service-catalog-editor";
import { countOccupiedSpots } from "@/lib/clinic-events/availability";
import {
  defaultIncludedCatalog,
  normalizeServiceCatalog,
} from "@/lib/clinics/service-catalog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Clinic, ClinicServiceOption, PublicClinicEvent, PublicBooking } from "@/lib/types";
import { Copy, Link2, Pencil, Plus } from "lucide-react";

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
    if (result?.email_warning) {
      setError(`Booking updated, but email failed: ${result.email_warning}`);
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
  const eventBookings = selectedEvent
    ? bookings.filter((b) => b.event_id === selectedEvent && b.contact_email !== "hold@pending.local")
    : [];

  const pendingBookings = eventBookings.filter((b) => b.status === "pending");
  const confirmedBookings = eventBookings.filter((b) => b.status === "confirmed");
  const waitlistBookings = eventBookings.filter((b) => b.status === "waitlist");
  const cancelledBookings = eventBookings.filter((b) => b.status === "cancelled");
  const otherBookings = eventBookings.filter(
    (b) => !["pending", "confirmed", "waitlist", "cancelled"].includes(b.status)
  );

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
      <div className="space-y-1"><Label>Total Spots</Label><Input type="number" value={form.total_spots} onChange={(e) => setForm({ ...form, total_spots: parseInt(e.target.value) || 0 })} /></div>
      <div className="space-y-1"><Label>Base Price (per cat)</Label><Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })} /></div>
      <ServiceCatalogEditor
        value={form.service_catalog}
        onChange={(service_catalog) => setForm({ ...form, service_catalog })}
      />
      <div className="space-y-1"><Label>Payment URL</Label><Input value={form.payment_url} onChange={(e) => setForm({ ...form, payment_url: e.target.value })} /></div>
      <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="space-y-1">
        <Label>After-signup message (shown on screen + pending email)</Label>
        <Textarea
          value={form.pending_email_message}
          onChange={(e) => setForm({ ...form, pending_email_message: e.target.value })}
          rows={3}
        />
      </div>
      <div className="space-y-1">
        <Label>Confirmation email message (sent when you approve a booking)</Label>
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
        <Label htmlFor="event-active">Active (visible on public booking page)</Label>
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
          return (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="cursor-pointer flex-1" onClick={() => setSelectedEvent(event.id)}>
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{event.clinic_name}</p>
                  </div>
                  <Badge variant={event.is_active ? "default" : "secondary"}>
                    {event.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="cursor-pointer" onClick={() => setSelectedEvent(event.id)}>
                  <p>{formatDate(event.date)} · {event.location}</p>
                  <p>{occupied}/{event.total_spots} taken · {remaining} left · {formatCurrency(event.base_price)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
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
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Manage bookings — {selectedEventData.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Confirm to approve and email. Move to waiting list if full. Cancel to release the spot.
              </p>
            </div>
            {eventBookings.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => copyAllEmails(eventBookings)}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                {emailsCopied ? "Copied!" : "Copy all emails"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <BookingGroup
              title={`Pending review (${pendingBookings.length})`}
              bookings={pendingBookings}
              updatingId={updatingBookingId}
              onConfirm={(id) => updateBookingStatus(id, "confirmed")}
              onWaitlist={(id) => updateBookingStatus(id, "waitlist")}
              onCancel={(id) => updateBookingStatus(id, "cancelled")}
              onTogglePayment={toggleAddonPayment}
            />

            <BookingGroup
              title={`Confirmed (${confirmedBookings.length})`}
              bookings={confirmedBookings}
              updatingId={updatingBookingId}
              onCancel={(id) => updateBookingStatus(id, "cancelled")}
              onTogglePayment={toggleAddonPayment}
            />

            <BookingGroup
              title={`Waiting list (${waitlistBookings.length})`}
              bookings={waitlistBookings}
              updatingId={updatingBookingId}
              onConfirm={(id) => updateBookingStatus(id, "confirmed")}
              onCancel={(id) => updateBookingStatus(id, "cancelled")}
              onTogglePayment={toggleAddonPayment}
            />

            <BookingGroup
              title={`Cancelled (${cancelledBookings.length})`}
              bookings={cancelledBookings}
              updatingId={updatingBookingId}
              onWaitlist={(id) => updateBookingStatus(id, "waitlist")}
              onTogglePayment={toggleAddonPayment}
            />

            {otherBookings.length > 0 && (
              <BookingGroup title="Other" bookings={otherBookings} updatingId={updatingBookingId} />
            )}

            {eventBookings.length === 0 && (
              <p className="text-muted-foreground">No bookings yet</p>
            )}
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

function BookingGroup({
  title,
  bookings,
  updatingId,
  onConfirm,
  onWaitlist,
  onCancel,
  onTogglePayment,
}: {
  title: string;
  bookings: PublicBooking[];
  updatingId: string | null;
  onConfirm?: (id: string) => void;
  onWaitlist?: (id: string) => void;
  onCancel?: (id: string) => void;
  onTogglePayment?: (bookingId: string, addonName: string, paid: boolean) => void;
}) {
  if (bookings.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">{title}</h4>
      {bookings.map((b) => (
        <div key={b.id} className="flex flex-col gap-3 text-sm border rounded-lg p-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <p className="font-medium">{b.contact_name}</p>
              <p className="text-muted-foreground">
                {b.cat_name ?? "Unnamed cat"} · {b.contact_email} · {b.contact_phone}
              </p>
              {b.cat_colors && (
                <p className="text-xs text-muted-foreground">
                  {b.cat_colors}{b.cat_gender ? ` · ${b.cat_gender}` : ""}
                </p>
              )}
              {b.notes && <p className="text-xs text-muted-foreground mt-1">{b.notes}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>{statusLabel(b.status)}</Badge>
              <span className="text-xs text-muted-foreground">{formatCurrency(b.total_price)}</span>
              {onConfirm && (
                <Button size="sm" disabled={updatingId === b.id} onClick={() => onConfirm(b.id)}>
                  Confirm
                </Button>
              )}
              {onWaitlist && (
                <Button size="sm" variant="outline" disabled={updatingId === b.id} onClick={() => onWaitlist(b.id)}>
                  Waiting list
                </Button>
              )}
              {onCancel && (
                <Button size="sm" variant="destructive" disabled={updatingId === b.id} onClick={() => onCancel(b.id)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {b.selected_addons.length > 0 && (
            <div className="rounded-md bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Add-on payment</p>
              {b.selected_addons.map((addon) => {
                const paid = b.addon_payments?.[addon] ?? false;
                return (
                  <div key={addon} className="flex items-center gap-2">
                    <Checkbox
                      checked={paid}
                      disabled={updatingId === b.id}
                      onCheckedChange={(checked) => onTogglePayment?.(b.id, addon, !!checked)}
                    />
                    <Label className="font-normal">
                      {addon} {paid ? "· Paid" : "· Unpaid"}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
