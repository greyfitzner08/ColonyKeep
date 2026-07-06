"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getApiErrorMessage } from "@/lib/api/errors";

interface ApplicationCertificatePanelProps {
  applicationId: string;
  certificateUrl: string | null;
  certificateUploaded: boolean;
  onUpdated: () => void;
}

export function ApplicationCertificatePanel({
  applicationId,
  certificateUrl,
  certificateUploaded,
  onUpdated,
}: ApplicationCertificatePanelProps) {
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileName = certificateUrl?.split("/").pop() ?? null;
  const hasCert = Boolean(certificateUploaded && certificateUrl);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const supabase = createClient();
    const path = `applications/${applicationId}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error: uploadError } = await supabase.storage.from("certificates").upload(path, file);

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const response = await fetch("/api/volunteers/application-certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, certificate_url: path }),
    });
    const result = await response.json().catch(() => null);
    setUploading(false);

    if (!response.ok) {
      setError(getApiErrorMessage(result, "Certificate uploaded but could not be saved"));
      return;
    }

    event.target.value = "";
    onUpdated();
  }

  async function openCertificate() {
    if (!certificateUrl) return;

    setError(null);
    setOpening(true);

    const response = await fetch(
      `/api/volunteers/application-certificate?path=${encodeURIComponent(certificateUrl)}`
    );
    const result = await response.json().catch(() => null);
    setOpening(false);

    if (!response.ok || !result?.url) {
      setError(getApiErrorMessage(result, "Could not open certificate"));
      return;
    }

    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">TNVR certificate file</p>
      <p className="text-xs text-muted-foreground">
        Upload the volunteer&apos;s certificate here, or check &quot;TNVR Certificate&quot; above
        after verifying an existing file. Required before trap team assignment.
      </p>
      {hasCert ? (
        <p className="text-sm text-green-700">
          Certificate on file{fileName ? `: ${fileName}` : ""}.
        </p>
      ) : (
        <p className="text-sm text-amber-700">No certificate file uploaded yet.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {certificateUrl && (
          <Button type="button" size="sm" variant="outline" disabled={opening} onClick={openCertificate}>
            {opening ? "Opening…" : "View certificate"}
          </Button>
        )}
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={uploading}
          className="max-w-xs"
          onChange={handleUpload}
        />
      </div>
      {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
