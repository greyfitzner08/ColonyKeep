"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

interface ClinicPackageServicesEditorProps {
  services: string[];
  onChange: (services: string[]) => void;
}

function normalizeServiceName(name: string): string {
  return name.trim();
}

export function ClinicPackageServicesEditor({
  services,
  onChange,
}: ClinicPackageServicesEditorProps) {
  const [draft, setDraft] = useState("");

  function addService() {
    const name = normalizeServiceName(draft);
    if (!name || services.includes(name)) {
      setDraft("");
      return;
    }
    onChange([...services, name]);
    setDraft("");
  }

  function removeService(name: string) {
    onChange(services.filter((service) => service !== name));
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-normal text-muted-foreground">Services in package</Label>

      {services.length > 0 ? (
        <ul className="space-y-2">
          {services.map((service) => (
            <li key={service} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <span className="min-w-0 flex-1 text-sm">{service}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeService(service)}
                aria-label={`Remove ${service}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add any services included in this package.
        </p>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="Service name"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addService();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addService} disabled={!draft.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add service
        </Button>
      </div>
    </div>
  );
}
