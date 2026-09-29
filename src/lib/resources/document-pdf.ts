import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "li"; text: string; marker: string }
  | { kind: "code"; text: string }
  | { kind: "rule" };

function plainText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Standard PDF fonts only cover WinAnsi. Map common punctuation the guides use. */
function pdfText(value: string): string {
  return value
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/[—–]/g, "-")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF]/g, "");
}

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    const text = plainText(paragraph.join(" "));
    paragraph = [];
    if (text) blocks.push({ kind: "p", text });
  }

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.startsWith("```") || line.startsWith("~~~")) {
      flushParagraph();
      const fence = line.slice(0, 3);
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").startsWith(fence)) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ kind: "code", text: code.join("\n") });
      index += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      flushParagraph();
      const rows: string[] = [];
      while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
        const cells = (lines[index] ?? "")
          .split("|")
          .slice(1, -1)
          .map((cell) => plainText(cell));
        if (cells.some((cell) => cell && !/^:?-+:?$/.test(cell))) rows.push(cells.join("  |  "));
        index += 1;
      }
      for (const row of rows) blocks.push({ kind: "p", text: row });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1]?.length ?? 1;
      const kind = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      blocks.push({ kind, text: plainText(heading[2] ?? "") });
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushParagraph();
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      blocks.push({ kind: "li", marker: "-", text: plainText(bullet[1] ?? "") });
      index += 1;
      continue;
    }

    const ordered = /^(\d+)\.\s+(.*)$/.exec(line);
    if (ordered) {
      flushParagraph();
      blocks.push({
        kind: "li",
        marker: `${ordered[1]}.`,
        text: plainText(ordered[2] ?? ""),
      });
      index += 1;
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      index += 1;
      continue;
    }

    paragraph.push(line.trim());
    index += 1;
  }

  flushParagraph();
  return blocks;
}

function wrapLine(text: string, font: PDFFont, size: number, width: number): string[] {
  const safe = pdfText(text);
  if (!safe) return [""];
  const words = safe.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function buildTextPdf(input: {
  title: string;
  description?: string | null;
  body?: string | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPage() {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function need(height: number) {
    if (y - height < MARGIN) newPage();
  }

  function drawWrapped(
    text: string,
    font: PDFFont,
    size: number,
    color = rgb(0.1, 0.12, 0.14),
    indent = 0
  ) {
    const lines = wrapLine(text, font, size, CONTENT_WIDTH - indent);
    const leading = size + 4;
    for (const line of lines) {
      need(leading);
      page.drawText(pdfText(line), {
        x: MARGIN + indent,
        y: y - size,
        size,
        font,
        color,
      });
      y -= leading;
    }
  }

  const body = input.body?.trim() ?? "";
  const blocks = body ? parseMarkdown(body) : [];
  const startsWithTitle =
    blocks[0]?.kind === "h1" &&
    blocks[0].text.localeCompare(input.title.trim(), undefined, { sensitivity: "accent" }) === 0;

  if (!startsWithTitle && input.title.trim()) {
    drawWrapped(input.title.trim(), bold, 18);
    y -= 6;
  }
  if (input.description?.trim()) {
    drawWrapped(input.description.trim(), regular, 11, rgb(0.3, 0.33, 0.36));
    y -= 8;
  }

  for (const block of blocks) {
    if (block.kind === "h1") {
      y -= 8;
      drawWrapped(block.text, bold, 18);
      y -= 4;
    } else if (block.kind === "h2") {
      y -= 8;
      drawWrapped(block.text, bold, 14);
      y -= 2;
    } else if (block.kind === "h3") {
      y -= 6;
      drawWrapped(block.text, bold, 12);
    } else if (block.kind === "li") {
      need(16);
      page.drawText(pdfText(block.marker), {
        x: MARGIN,
        y: y - 11,
        size: 11,
        font: regular,
        color: rgb(0.1, 0.12, 0.14),
      });
      const markerWidth = regular.widthOfTextAtSize(pdfText(block.marker), 11) + 8;
      const lines = wrapLine(block.text, regular, 11, CONTENT_WIDTH - markerWidth);
      const leading = 15;
      for (const line of lines) {
        need(leading);
        page.drawText(pdfText(line), {
          x: MARGIN + markerWidth,
          y: y - 11,
          size: 11,
          font: regular,
          color: rgb(0.1, 0.12, 0.14),
        });
        y -= leading;
      }
    } else if (block.kind === "code") {
      y -= 4;
      for (const codeLine of block.text.split("\n")) {
        const lines = wrapLine(codeLine || " ", mono, 9, CONTENT_WIDTH - 12);
        for (const line of lines) {
          need(13);
          page.drawText(pdfText(line), {
            x: MARGIN + 6,
            y: y - 9,
            size: 9,
            font: mono,
            color: rgb(0.15, 0.17, 0.2),
          });
          y -= 12;
        }
      }
      y -= 4;
    } else if (block.kind === "rule") {
      need(16);
      y -= 6;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_WIDTH - MARGIN, y },
        thickness: 0.5,
        color: rgb(0.75, 0.77, 0.8),
      });
      y -= 10;
    } else {
      drawWrapped(block.text, regular, 11);
      y -= 6;
    }
  }

  if (blocks.length === 0 && !input.description?.trim() && !input.title.trim()) {
    drawWrapped("This document has no text to include.", regular, 11);
  }

  return pdf.save();
}

function htmlToText(html: string): string {
  return plainText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export async function fileUrlToPdf(input: {
  title: string;
  description?: string | null;
  fileUrl: string;
}): Promise<Uint8Array> {
  const response = await fetch(input.fileUrl, {
    headers: { Accept: "application/pdf,image/*,text/plain,text/html;q=0.9,*/*;q=0.8" },
    redirect: "follow",
  });
  if (!response.ok) {
    return buildTextPdf({
      title: input.title,
      description: input.description,
      body: "",
    });
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (contentType.includes("pdf") || isPdfBytes(bytes)) return bytes;

  if (contentType.includes("png") || contentType.includes("jpeg") || contentType.includes("jpg")) {
    const pdf = await PDFDocument.create();
    const image = contentType.includes("png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const scale = Math.min(CONTENT_WIDTH / image.width, (PAGE_HEIGHT - MARGIN * 2) / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, {
      x: (PAGE_WIDTH - width) / 2,
      y: (PAGE_HEIGHT - height) / 2,
      width,
      height,
    });
    return pdf.save();
  }

  const raw = new TextDecoder().decode(bytes);
  const fromHtml = contentType.includes("html") || raw.trim().startsWith("<");
  const text = fromHtml ? htmlToText(raw) : plainText(raw);
  const pageText = text.length >= 200 && !/^notion$/i.test(text) ? text : "";
  return buildTextPdf({
    title: input.title,
    description: pageText ? input.description : null,
    body: pageText || input.description?.trim() || "",
  });
}
