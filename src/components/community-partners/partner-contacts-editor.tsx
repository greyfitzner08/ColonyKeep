"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  contactBirthdayFromParts,
  daysInPartnerBirthdayMonth,
  emptyPartnerContactInput,
  parseContactBirthdayParts,
  PARTNER_BIRTHDAY_MONTHS,
  setPrimaryContact,
  type PartnerContactInput,
} from "@/lib/community-partners/contacts";

type ContactsUpdater =
  | PartnerContactInput[]
  | ((current: PartnerContactInput[]) => PartnerContactInput[]);

interface PartnerContactsEditorProps {
  contacts: PartnerContactInput[];
  onChange: (contacts: ContactsUpdater) => void;
  title?: string;
  description?: string;
  addLabel?: string;
  embedded?: boolean;
}

function PartnerBirthdayFields({
  index,
  birthday,
  onChange,
}: {
  index: number;
  birthday: string;
  onChange: (birthday: string) => void;
}) {
  const { month, day } = parseContactBirthdayParts(birthday);
  const dayCount = month ? daysInPartnerBirthdayMonth(Number(month)) : 31;

  return (
    <div className="min-w-0 space-y-2">
      <p className="text-sm font-medium leading-none">Birthday (optional)</p>
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:max-w-md">
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`partner-contact-birthday-month-${index}`}>Month</Label>
          <Select
            value={month || "none"}
            onValueChange={(value) => {
              const nextMonth = value === "none" ? "" : value;
              const maxDay = nextMonth ? daysInPartnerBirthdayMonth(Number(nextMonth)) : 0;
              const nextDay = day && Number(day) > maxDay ? String(maxDay).padStart(2, "0") : day;
              onChange(contactBirthdayFromParts(nextMonth, nextMonth ? nextDay : ""));
            }}
          >
            <SelectTrigger id={`partner-contact-birthday-month-${index}`} className="w-full min-w-0">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              {PARTNER_BIRTHDAY_MONTHS.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`partner-contact-birthday-day-${index}`}>Day</Label>
          <Select
            value={day || "none"}
            disabled={!month}
            onValueChange={(value) =>
              onChange(contactBirthdayFromParts(month, value === "none" ? "" : value))
            }
          >
            <SelectTrigger id={`partner-contact-birthday-day-${index}`} className="w-full min-w-0">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              {Array.from({ length: dayCount }, (_, dayIndex) => {
                const value = String(dayIndex + 1).padStart(2, "0");
                return (
                  <SelectItem key={value} value={value}>
                    {dayIndex + 1}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Month and day only — we don&apos;t ask for a year. Shows on Team Feed as a blue pill: Name |
        Organization.
      </p>
    </div>
  );
}

export function PartnerContactsEditor({
  contacts,
  onChange,
  title = "People",
  description = "Add as many people as you need. Mark one as primary for quick reference in the table and exports.",
  addLabel = "Add contact",
  embedded = false,
}: PartnerContactsEditorProps) {
  function updateContact(index: number, patch: Partial<PartnerContactInput>) {
    onChange((current) =>
      current.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, ...patch } : contact
      )
    );
  }

  function addContact() {
    onChange((current) => [...current, emptyPartnerContactInput()]);
  }

  function removeContact(index: number) {
    onChange((current) => {
      const next = current.filter((_, contactIndex) => contactIndex !== index);
      return next.length > 0 ? next : [emptyPartnerContactInput()];
    });
  }

  function markPrimary(index: number) {
    onChange((current) => setPrimaryContact(current, index));
  }

  return (
    <div className="min-w-0 space-y-4">
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      {embedded ? null : <p className="text-xs text-muted-foreground">{description}</p>}

      {contacts.map((contact, index) => (
        <div key={contact.id ?? `new-${index}`} className="min-w-0 space-y-4 rounded-lg border bg-muted/30 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Contact {index + 1}</p>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="radio"
                  name="primary-contact"
                  checked={contact.is_primary}
                  onChange={() => markPrimary(index)}
                />
                Primary
              </label>
              {contacts.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeContact(index)}
                  aria-label={`Remove contact ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label>Name</Label>
              <Input
                className="min-w-0"
                value={contact.name}
                onChange={(event) => updateContact(index, { name: event.target.value })}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Title / role</Label>
              <Input
                className="min-w-0"
                value={contact.title}
                onChange={(event) => updateContact(index, { title: event.target.value })}
              />
            </div>
          </div>

          <PartnerBirthdayFields
            index={index}
            birthday={contact.birthday}
            onChange={(birthday) => updateContact(index, { birthday })}
          />

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label>Email</Label>
              <Input
                className="min-w-0"
                type="email"
                value={contact.email}
                onChange={(event) => updateContact(index, { email: event.target.value })}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Phone</Label>
              <Input
                className="min-w-0"
                value={contact.phone}
                onChange={(event) => updateContact(index, { phone: event.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contact notes</Label>
            <Textarea
              className="min-w-0"
              value={contact.notes}
              onChange={(event) => updateContact(index, { notes: event.target.value })}
              placeholder="Best time to reach them, preferred channel, etc."
              rows={2}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        onClick={addContact}
      >
        {addLabel}
      </Button>
    </div>
  );
}
