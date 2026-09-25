const ALLOWED_TAGS = new Set(["p", "div", "br", "strong", "b", "em", "i", "u", "span"]);
const DROP_CONTENT_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "noscript",
  "template",
  "textarea",
]);
const BLOCK_TAGS = new Set(["p", "div"]);

const NAMED_COLORS = new Set([
  "black",
  "white",
  "red",
  "green",
  "blue",
  "orange",
  "purple",
  "teal",
  "gray",
  "grey",
]);

function escapeText(text: string): string {
  return text
    .replace(/&(?!(?:amp|lt|gt|quot|nbsp|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeColor(raw: string): string | null {
  const value = raw.trim().replace(/!important/gi, "").replace(/^["']|["']$/g, "").trim();
  if (!value || /url\(|expression|javascript:/i.test(value)) return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value.toLowerCase();
  const rgb = value.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+)\s*)?\)$/i
  );
  if (rgb) {
    const channels = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    if (channels.some((channel) => channel > 255)) return null;
    return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
  }
  if (NAMED_COLORS.has(value.toLowerCase())) return value.toLowerCase();
  return null;
}

function sanitizeDeclarations(style: string): string {
  const parts: string[] = [];
  for (const declaration of style.split(";")) {
    const splitAt = declaration.indexOf(":");
    if (splitAt === -1) continue;
    const property = declaration.slice(0, splitAt).trim().toLowerCase();
    const value = declaration.slice(splitAt + 1).trim();
    if (!value || /url\(|expression|javascript:/i.test(value)) continue;
    if (property === "color") {
      const color = normalizeColor(value);
      if (color) parts.push(`color:${color}`);
    } else if (property === "font-weight" && /^(bold|[6-9]00)$/i.test(value)) {
      parts.push("font-weight:bold");
    } else if (property === "font-style" && /^italic$/i.test(value)) {
      parts.push("font-style:italic");
    } else if (
      (property === "text-decoration" || property === "text-decoration-line") &&
      /underline/i.test(value)
    ) {
      parts.push("text-decoration:underline");
    }
  }
  return parts.join(";");
}

function readAttribute(source: string, name: string): string | null {
  const match = source.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"));
  if (!match) return null;
  return match[2] ?? match[3] ?? match[4] ?? null;
}

function plainTextToHtml(text: string): string {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks
    .map((block) => `<p>${block.split("\n").map((line) => escapeText(line)).join("<br>")}</p>`)
    .join("");
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value);
}

type OpenTag = { tag: string; emitted: "span" | string };

/**
 * Keep bold, italic, underline, text color, and paragraphs.
 * Everything else is dropped so the public form cannot render scripts or links.
 */
export function sanitizeIntakeAboutHtml(input: string): string {
  const source = input.replace(/\u0000/g, "");
  if (!source.trim()) return "";
  if (!looksLikeHtml(source)) return plainTextToHtml(source);

  let html = "";
  const stack: OpenTag[] = [];
  let skipping: string | null = null;
  let skipDepth = 0;
  const token = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)[^>]*>|<([a-zA-Z][\w:-]*)([^>]*)>|([^<]+)|</g;
  let match: RegExpExecArray | null;

  while ((match = token.exec(source)) !== null) {
    if (match[0].startsWith("<!--")) continue;

    if (match[1]) {
      const tag = match[1].toLowerCase();
      if (skipping) {
        if (tag === skipping) skipDepth -= 1;
        if (skipDepth <= 0) {
          skipping = null;
          skipDepth = 0;
        }
        continue;
      }
      if (!ALLOWED_TAGS.has(tag) && tag !== "font") continue;
      const closeIndex = [...stack].reverse().findIndex((open) => open.tag === tag);
      if (closeIndex === -1) continue;
      const from = stack.length - 1 - closeIndex;
      while (stack.length > from) {
        const open = stack.pop();
        if (open) html += `</${open.emitted}>`;
      }
      continue;
    }

    if (match[2]) {
      const tag = match[2].toLowerCase();
      const attrs = match[3] ?? "";
      const selfClosing = /\/\s*$/.test(attrs);
      if (skipping) {
        if (DROP_CONTENT_TAGS.has(tag) && !selfClosing) skipDepth += 1;
        continue;
      }
      if (DROP_CONTENT_TAGS.has(tag)) {
        if (!selfClosing) {
          skipping = tag;
          skipDepth = 1;
        }
        continue;
      }

      if (tag === "br") {
        html += "<br>";
        continue;
      }

      if (tag === "font") {
        const color = normalizeColor(readAttribute(attrs, "color") ?? "");
        if (!color) continue;
        if (stack.some((open) => open.tag === "p") === false && stack.length === 0) {
          html += "<p>";
          stack.push({ tag: "p", emitted: "p" });
        }
        html += `<span style="color:${color}">`;
        if (!selfClosing) stack.push({ tag: "font", emitted: "span" });
        else html += "</span>";
        continue;
      }

      if (!ALLOWED_TAGS.has(tag)) continue;

      if (BLOCK_TAGS.has(tag)) {
        while (stack.some((open) => BLOCK_TAGS.has(open.tag))) {
          const open = stack.pop();
          if (open) html += `</${open.emitted}>`;
        }
      }

      let emitted = tag === "div" ? "p" : tag;
      let openTag = `<${emitted}>`;
      if (tag === "span") {
        const style = sanitizeDeclarations(readAttribute(attrs, "style") ?? "");
        if (!style) continue;
        emitted = "span";
        openTag = `<span style="${style}">`;
      }

      html += openTag;
      if (!selfClosing) stack.push({ tag, emitted });
      else html += `</${emitted}>`;
      continue;
    }

    if (match[4] && !skipping) {
      html += escapeText(match[4]);
      continue;
    }

    if (!skipping && match[0] === "<") html += "&lt;";
  }

  while (stack.length > 0) {
    const open = stack.pop();
    if (open) html += `</${open.emitted}>`;
  }

  return html.replace(/<(p|span|strong|b|em|i|u)>\s*<\/\1>/gi, "").trim();
}

export function intakeAboutPlainText(value: string): string {
  return sanitizeIntakeAboutHtml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');
}
