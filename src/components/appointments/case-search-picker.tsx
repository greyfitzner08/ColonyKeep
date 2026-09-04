"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  filterHelpRequestOptions,
  formatHelpRequestLabel,
  type HelpRequestOption,
} from "@/lib/cases/help-request-options";

interface CaseSearchPickerProps {
  options: HelpRequestOption[];
  value: string;
  onChange: (id: string) => void;
}

export function CaseSearchPicker({ options, value, onChange }: CaseSearchPickerProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const selected = options.find((option) => option.id === value);

  const results = useMemo(
    () => filterHelpRequestOptions(options, deferredQuery),
    [options, deferredQuery]
  );

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div>
          <p className="font-medium">{selected.case_number}</p>
          <p className="text-sm text-muted-foreground">{selected.contact_name}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange("");
            setQuery("");
          }}
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type case # or contact name…"
        autoComplete="off"
        spellCheck={false}
      />
      {results.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto rounded-md border divide-y">
          {results.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                onClick={() => {
                  onChange(option.id);
                  setQuery("");
                }}
              >
                {formatHelpRequestLabel(option)}
              </button>
            </li>
          ))}
        </ul>
      ) : deferredQuery.trim() ? (
        <p className="text-sm text-muted-foreground px-1">No matching cases.</p>
      ) : (
        <p className="text-sm text-muted-foreground px-1">
          Start typing to search open cases.
        </p>
      )}
    </div>
  );
}
