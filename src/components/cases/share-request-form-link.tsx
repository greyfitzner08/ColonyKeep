"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareRequestFormLink() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/request`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link to share the request form:", url);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copyLink}>
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          Copy request form link
        </>
      )}
    </Button>
  );
}
