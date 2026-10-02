const ALLOWED = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "i",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "u",
  "ul",
]);

const TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\/?>/g;

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(value);
}

/** Turn a Google Calendar description into text or a small set of safe tags. */
export function sanitizeCalendarHtml(input: string): string {
  const prepared = unescapeDescription(input).replace(/\u0000/g, "").trim();
  if (!prepared) return "";
  if (!looksLikeHtml(prepared)) return prepared;

  const withoutDanger = prepared
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  let openAnchors = 0;
  const cleaned = withoutDanger.replace(TAG_PATTERN, (full, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED.has(name)) return "";
    if (name === "br") return "<br>";
    if (name === "a") {
      if (full.startsWith("</")) {
        if (openAnchors === 0) return "";
        openAnchors -= 1;
        return "</a>";
      }
      const href = safeHref(rawAttrs);
      if (!href) return "";
      openAnchors += 1;
      return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`;
    }
    if (full.startsWith("</")) return `</${name}>`;
    return `<${name}>`;
  });

  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

function unescapeDescription(value: string): string {
  let current = value.replace(/\r\n/g, "\n");
  if (looksLikeHtml(current) || !/&(?:lt|gt|amp|quot|#\d+|#x[0-9a-f]+);/i.test(current)) {
    return current;
  }
  for (let pass = 0; pass < 2; pass += 1) {
    const next = decodeEntities(current);
    if (next === current) break;
    current = next;
    if (looksLikeHtml(current)) break;
  }
  return current;
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|nbsp|apos);/gi, (entity, body: string) => {
    const token = body.toLowerCase();
    if (token === "amp") return "&";
    if (token === "lt") return "<";
    if (token === "gt") return ">";
    if (token === "quot") return '"';
    if (token === "apos") return "'";
    if (token === "nbsp") return " ";
    if (token.startsWith("#x")) return codePoint(parseInt(token.slice(2), 16));
    if (token.startsWith("#")) return codePoint(parseInt(token.slice(1), 10));
    return entity;
  });
}

function codePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function safeHref(attrs: string): string | null {
  const match = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(attrs);
  const raw = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
  if (!raw) return null;
  const href = decodeEntities(raw).replace(/[\u0000-\u001f\s]/g, "");
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return href;
  return null;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
