"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyPartnerContactInput,
  setPrimaryContact,
  type PartnerContactInput,
} from "@/lib/community-partners/contacts";

interface PartnerContactsEditorProps {
  contacts: PartnerContactInput[];
  onChange: (contacts: PartnerContactInput[]) => void;
  title?: string;
  description?: string;
  addLabel?: string;
  embedded?: boolean;
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
    onChange(contacts.map((contact, contactIndex) => (contactIndex === index ? { ...contact, ...patch } : contact)));
  }

  function addContact() {
    onChange([...contacts, emptyPartnerContactInput()]);
  }

  function removeContact(index: number) {
    const next = contacts.filter((_, contactIndex) => contactIndex !== index);
    onChange(next.length > 0 ? next : [emptyPartnerContactInput()]);
  }

  function markPrimary(index: number) {
    onChange(setPrimaryContact(contacts, index));
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {title ? <p className="text-sm font-medium">{title}</p> : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full shrink-0 sm:ml-auto sm:w-auto"
          onClick={addContact}
        >
          {addLabel}
        </Button>
      </div>
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
    </div>
  );
}
