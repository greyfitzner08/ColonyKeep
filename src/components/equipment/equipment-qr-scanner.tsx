"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EquipmentQrScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (payload: string) => void;
}

type Html5QrcodeInstance = {
  isScanning: boolean;
  start: (
    cameraIdOrConfig: string | MediaTrackConstraints,
    configuration: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (decoded: string) => void,
    onError: () => void
  ) => Promise<null>;
  stop: () => Promise<void>;
};

async function waitForElement(id: string, attempts = 20): Promise<HTMLElement | null> {
  for (let i = 0; i < attempts; i += 1) {
    const element = document.getElementById(id);
    if (element) return element;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return null;
}

export function EquipmentQrScanner({ open, onOpenChange, onScan }: EquipmentQrScannerProps) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const onScanRef = useRef(onScan);
  const onOpenChangeRef = useRef(onOpenChange);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  onScanRef.current = onScan;
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) {
      setError(null);
      setStarting(false);
      return;
    }

    let cancelled = false;

    async function startScanner() {
      setError(null);
      setStarting(true);

      try {
        const element = await waitForElement(regionId);
        if (cancelled) return;

        if (!element) {
          setError("Scanner view failed to load. Close and try again.");
          return;
        }

        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId) as Html5QrcodeInstance;
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            onScanRef.current(decoded);
            onOpenChangeRef.current(false);
          },
          () => {
            // Ignore per-frame scan misses.
          }
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "Unable to access camera. Check browser permissions.";
        setError(message);
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      const active = scannerRef.current;
      scannerRef.current = null;
      if (!active?.isScanning) return;
      void active.stop().catch(() => undefined);
    };
  }, [open, regionId]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Equipment QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at the trap&apos;s QR label. Type, label, and description will fill
            in automatically when recognized.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            id={regionId}
            className="overflow-hidden rounded-lg border bg-muted min-h-[260px]"
          />
          {starting && !error && (
            <p className="text-sm text-muted-foreground text-center">Starting camera…</p>
          )}
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
