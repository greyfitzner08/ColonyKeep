"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PartnerValueListProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  addLabel: string;
}

export function PartnerValueList({
  label,
  values,
  onChange,
  type = "text",
  placeholder,
  addLabel,
}: PartnerValueListProps) {
  const items = values.length > 0 ? values : [""];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((value, index) => (
        <div key={`${label}-${index}`} className="flex gap-2">
          <Input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(event) => {
              const next = [...items];
              next[index] = event.target.value;
              onChange(next);
            }}
          />
          {items.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
        {addLabel}
      </Button>
    </div>
  );
}
