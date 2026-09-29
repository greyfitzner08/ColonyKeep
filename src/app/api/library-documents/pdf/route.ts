import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/api/auth";
import { documentVisibleToProfile } from "@/lib/permissions";
import { buildTextPdf, fileUrlToPdf } from "@/lib/resources/document-pdf";
import { createServiceClient } from "@/lib/supabase/server";
import type { LibraryDocument } from "@/lib/types";

function pdfFilename(title: string): string {
  const base = title
    .trim()
    .replace(/[^\w\s.-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "document"}.pdf`;
}

export async function GET(request: NextRequest) {
  const { profile, response } = await getAuthenticatedProfile();
  if (response) return response;

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing document" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data, error } = await service.from("library_documents").select("*").eq("id", id).maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const document = data as LibraryDocument;
  if (document.is_active === false || !documentVisibleToProfile(document.view_roles, profile, document.section)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const body = document.body_markdown?.trim() ?? "";
  const fileUrl = document.file_url?.trim() ?? "";
  let pdf: Uint8Array;
  if (body) {
    pdf = await buildTextPdf({
      title: document.title,
      description: document.description,
      body,
    });
  } else if (fileUrl) {
    pdf = await fileUrlToPdf({
      title: document.title,
      description: document.description,
      fileUrl,
    });
  } else {
    pdf = await buildTextPdf({
      title: document.title,
      description: document.description,
      body: "",
    });
  }

  const filename = pdfFilename(document.title);
  const pdfBytes = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(pdfBytes).set(pdf);
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
