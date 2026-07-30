"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

/** Build a single-line address when the form only stores one address field. */
export function formatAddressPartsLine(
  parts: Pick<AddressParts, "address" | "city" | "state" | "zip" | "formatted_address">
): string {
  if (parts.formatted_address?.trim()) return parts.formatted_address.trim();
  const cityState = [parts.city, parts.state].filter(Boolean).join(", ");
  const cityStateZip = [cityState, parts.zip].filter(Boolean).join(" ");
  return [parts.address, cityStateZip].filter(Boolean).join(", ");
}

function emptyParts(fallback: string): AddressParts {
  return {
    address: fallback,
    city: "",
    state: "",
    county: "",
    zip: "",
    formatted_address: fallback,
  };
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
  const reactId = useId();
  const inputId = id ?? `address-${reactId}`;
  const [query, setQuery] = useState(defaultValue);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastDefaultRef = useRef(defaultValue);
  const selectingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectingRef.current) {
      lastDefaultRef.current = defaultValue;
      return;
    }
    if (defaultValue !== lastDefaultRef.current && defaultValue !== query) {
      setQuery(defaultValue);
    }
    lastDefaultRef.current = defaultValue;
  }, [defaultValue, query]);

  useEffect(() => {
    if (selectingRef.current) return;
    if (query.length < 3) {
      setPredictions([]);
      setStatusError(null);
      setOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (selectingRef.current) return;
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (selectingRef.current) return;
        setPredictions(data.predictions ?? []);
        setStatusError(typeof data.error === "string" ? data.error : null);
        setOpen(true);
      } catch {
        setPredictions([]);
        setStatusError("Could not load address suggestions.");
        setOpen(true);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      const input = inputRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 1000,
        // Critical: Radix modal sets pointer-events:none on body; re-enable for this menu.
        pointerEvents: "auto",
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, predictions.length, statusError]);

  async function applyPrediction(prediction: Prediction) {
    selectingRef.current = true;
    clearTimeout(debounceRef.current);
    setOpen(false);
    setPredictions([]);
    setStatusError(null);
    setQuery(prediction.description);
    onAddressChange?.(prediction.description);

    let parts = emptyParts(prediction.description);
    try {
      const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(prediction.place_id)}`);
      const data = await res.json().catch(() => null);
      if (data && typeof data === "object") {
        const formatted =
          (typeof data.formatted_address === "string" && data.formatted_address.trim()) ||
          prediction.description;
        parts = {
          address: typeof data.address === "string" ? data.address : prediction.description,
          city: typeof data.city === "string" ? data.city : "",
          state: typeof data.state === "string" ? data.state : "",
          county: typeof data.county === "string" ? data.county : "",
          zip: typeof data.zip === "string" ? data.zip : "",
          lat: typeof data.lat === "number" ? data.lat : undefined,
          lng: typeof data.lng === "number" ? data.lng : undefined,
          formatted_address: formatted,
        };
        setQuery(formatted);
        onAddressChange?.(formatted);
      }
    } catch {
      // Keep prediction description.
    }

    onSelect(parts);
    lastDefaultRef.current = parts.formatted_address ?? prediction.description;

    window.setTimeout(() => {
      selectingRef.current = false;
    }, 300);
  }

  const showMenu = open && (predictions.length > 0 || Boolean(statusError));

  return (
    <div ref={rootRef} className="relative space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        ref={inputRef}
        id={inputId}
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
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        aria-autocomplete="list"
        aria-expanded={showMenu}
      />
      {showMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-address-suggest=""
            className={cn(
              "max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg"
            )}
            style={menuStyle}
            // Capture before Dialog dismiss logic; keep modal body pointer-events from blocking.
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {predictions.length > 0 ? (
              <ul className="py-1" role="listbox">
                {predictions.map((prediction) => (
                  <li key={prediction.place_id} role="option">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void applyPrediction(prediction);
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void applyPrediction(prediction);
                      }}
                    >
                      {prediction.description}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-sm text-muted-foreground">{statusError}</p>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
