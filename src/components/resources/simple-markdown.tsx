"use client";

import { Fragment, type ReactNode } from "react";
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

/** Lightweight markdown renderer for in-app resource guides (no external dependency). */
export function SimpleMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trim() === "---") {
      blocks.push(<hr key={key++} className="my-6 border-border" />);
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
      blocks.push(
        <pre
          key={key++}
          className="my-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed"
        >
          <code>{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (line.trim().startsWith("|")) {
      const tableRows: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableRows.push(lines[index]);
        index += 1;
      }
      blocks.push(<Fragment key={key++}>{renderTable(tableRows)}</Fragment>);
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const HeadingTag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as
        | "h1"
        | "h2"
        | "h3";
      const headingClass =
        level === 1
          ? "mt-2 mb-3 text-2xl font-bold tracking-tight"
          : level === 2
            ? "mt-6 mb-2 text-xl font-semibold"
            : "mt-4 mb-1.5 text-base font-semibold";
      blocks.push(
        <HeadingTag key={key++} className={headingClass}>
          {renderInline(text)}
        </HeadingTag>
      );
      index += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={key++} className="my-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={key++} className="my-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("#") &&
      !lines[index].startsWith("```") &&
      lines[index].trim() !== "---" &&
      !lines[index].trim().startsWith("|") &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <p key={key++} className="my-2 text-sm leading-relaxed">
        {renderInline(paragraph.join(" "))}
      </p>
    );
  }

  return <div className={cn("max-w-none text-foreground", className)}>{blocks}</div>;
}
