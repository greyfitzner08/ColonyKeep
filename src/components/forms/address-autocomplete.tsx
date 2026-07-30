"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AddressParts {
  address: string;
  city: string;
  state: string;
  county: string;
  zip: string;
  lat?: number;
  lng?: number;
  formatted_address?: string;
}

interface AddressAutocompleteProps {
  onSelect: (parts: AddressParts) => void;
  onAddressChange?: (address: string) => void;
  defaultValue?: string;
  label?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
}

interface Prediction {
  description: string;
  place_id: string;
}

interface DropdownRect {
  top: number;
  left: number;
  width: number;
}

/** Build a single-line address when the form only stores one address field. */
export function formatAddressPartsLine(
  parts: Pick<AddressParts, "address" | "city" | "state" | "zip" | "formatted_address">
): string {
  if (parts.formatted_address?.trim()) return parts.formatted_address.trim();
  const cityState = [parts.city, parts.state].filter(Boolean).join(", ");
  const cityStateZip = [cityState, parts.zip].filter(Boolean).join(" ");
  return [parts.address, cityStateZip].filter(Boolean).join(", ");
}

export function AddressAutocomplete({
  onSelect,
  onAddressChange,
  defaultValue = "",
  label = "Address",
  required = false,
  id,
  placeholder = "Start typing an address...",
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastDefaultRef = useRef(defaultValue);
  const selectingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (defaultValue !== lastDefaultRef.current && defaultValue !== query) {
      setQuery(defaultValue);
    }
    lastDefaultRef.current = defaultValue;
  }, [defaultValue, query]);

  useEffect(() => {
    if (query.length < 3) {
      setPredictions([]);
      setStatusError(null);
      return;
    }

    // Don't refetch while a suggestion is being applied.
    if (selectingRef.current) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
        const data = await res.json();
        setPredictions(data.predictions ?? []);
        setStatusError(typeof data.error === "string" ? data.error : null);
        setOpen(true);
      } catch {
        setPredictions([]);
        setStatusError("Could not load address suggestions.");
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useLayoutEffect(() => {
    if (!open || (predictions.length === 0 && !statusError)) {
      setDropdownRect(null);
      return;
    }

    function updatePosition() {
      const input = inputRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, predictions.length, statusError, query]);

  async function handleSelect(prediction: Prediction) {
    selectingRef.current = true;
    clearTimeout(debounceRef.current);
    setQuery(prediction.description);
    setOpen(false);
    setPredictions([]);
    onAddressChange?.(prediction.description);

    try {
      const res = await fetch(`/api/places/details?place_id=${prediction.place_id}`);
      const data = await res.json();
      const line =
        typeof data?.formatted_address === "string" && data.formatted_address.trim()
          ? data.formatted_address.trim()
          : prediction.description;
      setQuery(line);
      onAddressChange?.(line);
      onSelect({
        address: "",
        city: "",
        state: "",
        county: "",
        zip: "",
        ...data,
        formatted_address: data?.formatted_address || prediction.description,
      });
    } catch {
      onSelect({
        address: prediction.description,
        city: "",
        state: "",
        county: "",
        zip: "",
        formatted_address: prediction.description,
      });
    } finally {
      // Allow parent defaultValue sync, then resume typing/search.
      window.setTimeout(() => {
        selectingRef.current = false;
      }, 0);
    }
  }

  const showDropdown = open && dropdownRect && (predictions.length > 0 || Boolean(statusError));

  return (
    <div className="relative space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        value={query}
        onChange={(e) => {
          selectingRef.current = false;
          const value = e.target.value;
          setQuery(value);
          onAddressChange?.(value);
        }}
        onFocus={() => {
          if (predictions.length > 0 || statusError) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (selectingRef.current) return;
            if (listRef.current?.contains(document.activeElement)) return;
            setOpen(false);
          }, 200);
        }}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
      />
      {showDropdown &&
        createPortal(
          <ul
            ref={listRef}
            data-address-suggest=""
            className="fixed z-[200] max-h-60 overflow-auto rounded-md border bg-popover shadow-lg"
            style={{
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
            onMouseDown={(event) => {
              // Keep focus handling from closing the dialog/dropdown before selection.
              event.preventDefault();
            }}
          >
            {predictions.length > 0 ? (
              predictions.map((p) => (
                <li key={p.place_id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void handleSelect(p);
                    }}
                  >
                    {p.description}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-muted-foreground">{statusError}</li>
            )}
          </ul>,
          document.body
        )}
    </div>
  );
}
