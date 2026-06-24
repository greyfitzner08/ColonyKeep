"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareRequestFormLinkProps {
  requestFormUrl: string;
}

export function ShareRequestFormLink({ requestFormUrl }: ShareRequestFormLinkProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(requestFormUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link to share the request form:", requestFormUrl);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      <Button type="button" variant="ghost" size="sm" asChild>
        <a href={requestFormUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4 mr-2" />
          Preview form
        </a>
      </Button>
    </div>
  );
}
