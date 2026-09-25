"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Eraser, Italic, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeIntakeAboutHtml } from "@/lib/intake-about-html";
import { cn } from "@/lib/utils";

const COLORS = [
  { label: "Default", value: "#1f2937" },
  { label: "Green", value: "#21966b" },
  { label: "Red", value: "#b42318" },
  { label: "Blue", value: "#1d4ed8" },
];

const editorClassName =
  "min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_p+p]:mt-3";

export function IntakeAboutEditor({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedOffsets = useRef<{ start: number; end: number } | null>(null);
  const [active, setActive] = useState({ bold: false, italic: false, underline: false });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const html = sanitizeIntakeAboutHtml(value);
    if (editor.innerHTML !== html) editor.innerHTML = html;
  }, [value]);

  useEffect(() => {
    function syncActive() {
      const editor = editorRef.current;
      if (!editor || !editor.contains(document.activeElement) && document.activeElement !== editor) {
        return;
      }
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
      });
    }
    document.addEventListener("selectionchange", syncActive);
    return () => document.removeEventListener("selectionchange", syncActive);
  }, []);

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    const before = range.cloneRange();
    before.selectNodeContents(editor);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    savedOffsets.current = { start, end: start + range.toString().length };
  }

  function restoreSelection() {
    const editor = editorRef.current;
    const offsets = savedOffsets.current;
    if (!editor || !offsets || offsets.start === offsets.end) return;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let consumed = 0;
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;
    let node = walker.nextNode() as Text | null;
    while (node) {
      const length = node.data.length;
      if (!startNode && consumed + length >= offsets.start) {
        startNode = node;
        startOffset = offsets.start - consumed;
      }
      if (consumed + length >= offsets.end) {
        endNode = node;
        endOffset = offsets.end - consumed;
        break;
      }
      consumed += length;
      node = walker.nextNode() as Text | null;
    }
    if (!startNode || !endNode) return;
    const range = document.createRange();
    range.setStart(startNode, Math.min(startOffset, startNode.data.length));
    range.setEnd(endNode, Math.min(endOffset, endNode.data.length));
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function publish() {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(editor.innerHTML);
  }

  function captureLiveSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    if (!editor.contains(selection.getRangeAt(0).commonAncestorContainer)) return;
    rememberSelection();
  }

  function applyCommand(command: string, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    captureLiveSelection();
    editor.focus();
    restoreSelection();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("defaultParagraphSeparator", false, "p");
    restoreSelection();
    const offsets = savedOffsets.current;
    document.execCommand(command, false, commandValue);
    if (offsets && offsets.start !== offsets.end) savedOffsets.current = offsets;
    restoreSelection();
    publish();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant={active.bold ? "secondary" : "outline"}
          size="sm"
          aria-pressed={active.bold}
          aria-label="Bold"
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("bold");
          }}
        >
          <Bold />
          Bold
        </Button>
        <Button
          type="button"
          variant={active.italic ? "secondary" : "outline"}
          size="sm"
          aria-pressed={active.italic}
          aria-label="Italic"
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("italic");
          }}
        >
          <Italic />
          Italic
        </Button>
        <Button
          type="button"
          variant={active.underline ? "secondary" : "outline"}
          size="sm"
          aria-pressed={active.underline}
          aria-label="Underline"
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("underline");
          }}
        >
          <Underline />
          Underline
        </Button>
        <span className="mx-1 hidden h-6 w-px bg-border sm:inline-block" aria-hidden />
        {COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.label}
            aria-label={`${color.label} text`}
            disabled={disabled}
            className="h-7 w-7 rounded-full border border-input disabled:opacity-50"
            style={{ backgroundColor: color.value }}
            onMouseDown={(event) => {
              event.preventDefault();
              applyCommand("foreColor", color.value);
            }}
          />
        ))}
        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          Custom
          <input
            type="color"
            aria-label="Custom text color"
            disabled={disabled}
            defaultValue="#21966b"
            className="h-7 w-9 cursor-pointer rounded border border-input bg-background p-0.5 disabled:cursor-not-allowed"
            onPointerDown={rememberSelection}
            onChange={(event) => applyCommand("foreColor", event.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("removeFormat");
          }}
        >
          <Eraser />
          Clear formatting
        </Button>
      </div>
      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label="About us"
        contentEditable={!disabled}
        suppressContentEditableWarning
        className={cn(editorClassName, disabled && "cursor-not-allowed opacity-50")}
        onFocus={() => {
          document.execCommand("defaultParagraphSeparator", false, "p");
        }}
        onMouseUp={rememberSelection}
        onKeyUp={rememberSelection}
        onInput={publish}
        onBlur={() => {
          const editor = editorRef.current;
          if (!editor) return;
          const clean = sanitizeIntakeAboutHtml(editor.innerHTML);
          editor.innerHTML = clean;
          onChange(clean);
        }}
      />
    </div>
  );
}
