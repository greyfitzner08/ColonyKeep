"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`b-${key++}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(
        <code key={`c-${key++}`} className="rounded bg-muted px-1 py-0.5 text-[0.9em]">
          {token.slice(1, -1)}
        </code>
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderTable(rows: string[]): ReactNode {
  const cells = rows.map((row) =>
    row
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())
  );
  if (cells.length < 2) return null;
  const header = cells[0];
  const body = cells.slice(2); // skip separator row

  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            {header.map((cell, index) => (
              <th key={index} className="px-2 py-1.5 text-left font-semibold">
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-muted">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2 py-1.5 align-top">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type MdBlock =
  | { type: "hr" }
  | { type: "code"; code: string }
  | { type: "table"; rows: string[] }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "ol"; items: string[] }
  | { type: "ul"; items: string[] }
  | { type: "p"; text: string };

function parseMarkdownBlocks(content: string): MdBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trim() === "---") {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    if (line.startsWith("```") || line.startsWith("~~~")) {
      const fence = line.startsWith("```") ? "```" : "~~~";
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith(fence)) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", code: code.join("\n") });
      continue;
    }

    if (line.trim().startsWith("|")) {
      const tableRows: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableRows.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "table", rows: tableRows });
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      index += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("#") &&
      !lines[index].startsWith("```") &&
      !lines[index].startsWith("~~~") &&
      lines[index].trim() !== "---" &&
      !lines[index].trim().startsWith("|") &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "p", text: paragraph.join(" ") });
  }

  return blocks;
}

function renderLeafBlock(block: MdBlock, key: number): ReactNode {
  switch (block.type) {
    case "hr":
      return <hr key={key} className="my-6 border-border" />;
    case "code":
      return (
        <pre
          key={key}
          className="my-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed"
        >
          <code>{block.code}</code>
        </pre>
      );
    case "table":
      return <Fragment key={key}>{renderTable(block.rows)}</Fragment>;
    case "ol":
      return (
        <ol key={key} className="my-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case "ul":
      return (
        <ul key={key} className="my-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "p":
      return (
        <p key={key} className="my-2 text-sm leading-relaxed">
          {renderInline(block.text)}
        </p>
      );
    case "heading":
      return null;
  }
}

function CollapsibleSection({
  level,
  title,
  children,
}: {
  level: 2 | 3;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={cn(
        "my-3 overflow-hidden rounded-lg border",
        level === 2 ? "border-border" : "border-border/70 bg-muted/20"
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span
          className={cn(
            "min-w-0 flex-1 font-semibold leading-snug",
            level === 2 ? "text-base" : "text-sm"
          )}
        >
          {renderInline(title)}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? <div className="space-y-1 border-t px-3 py-3">{children}</div> : null}
    </section>
  );
}

function renderBlockRange(blocks: MdBlock[], start: number, end: number, keyBase: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  let index = start;
  let key = keyBase;

  while (index < end) {
    const block = blocks[index];

    if (block.type === "heading" && block.level === 1) {
      nodes.push(
        <h1 key={key++} className="mt-2 mb-3 text-2xl font-bold tracking-tight">
          {renderInline(block.text)}
        </h1>
      );
      index += 1;
      continue;
    }

    if (block.type === "heading" && (block.level === 2 || block.level === 3)) {
      const sectionLevel = block.level;
      const title = block.text;
      let cursor = index + 1;
      while (cursor < end) {
        const next = blocks[cursor];
        if (next.type === "heading" && next.level <= sectionLevel) break;
        cursor += 1;
      }
      nodes.push(
        <CollapsibleSection key={key++} level={sectionLevel} title={title}>
          {renderBlockRange(blocks, index + 1, cursor, key * 100)}
        </CollapsibleSection>
      );
      index = cursor;
      continue;
    }

    nodes.push(renderLeafBlock(block, key++));
    index += 1;
  }

  return nodes;
}

/** Lightweight markdown renderer for in-app resource guides (no external dependency). */
export function SimpleMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseMarkdownBlocks(content);
  return (
    <div className={cn("max-w-none text-foreground", className)}>
      {renderBlockRange(blocks, 0, blocks.length, 0)}
    </div>
  );
}
