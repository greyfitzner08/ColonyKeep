"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CaseImporter } from "@/components/cases/case-importer";

export function InquiryAdminMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Case admin tools"
      >
        <Settings className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Case admin tools</DialogTitle>
            <DialogDescription>
              Import legacy cases, assign trap teams by colony size/ZIP, and manage bulk updates.
            </DialogDescription>
          </DialogHeader>
          <CaseImporter variant="panel" />
        </DialogContent>
      </Dialog>
    </>
  );
}
