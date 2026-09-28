"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Eraser, Italic, Link2, List, Underline } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  "min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_li+li]:mt-1 [&_p+p]:mt-3 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5";

const documentEditorClassName =
  "min-h-[22rem] w-full bg-background px-6 py-5 text-[15px] leading-7 outline-none [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_li+li]:mt-1 [&_p+p]:mt-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6";

export function IntakeAboutEditor({
  id,
  value,
  disabled,
  onChange,
  allowLinks = false,
  allowLists = false,
  variant = "plain",
}: {
  id: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  allowLinks?: boolean;
  allowLists?: boolean;
  variant?: "plain" | "document";
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedOffsets = useRef<{ start: number; end: number } | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [active, setActive] = useState({ bold: false, italic: false, underline: false, list: false });
  const documentMode = variant === "document";

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const html = sanitizeIntakeAboutHtml(value, { allowLinks });
    if (editor.innerHTML !== html) editor.innerHTML = html;
  }, [allowLinks, value]);

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
        list: document.queryCommandState("insertUnorderedList"),
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
    if (!editor || !offsets) return;
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

  function insertLink() {
    const href = linkUrl.trim();
    const editor = editorRef.current;
    if (!editor || disabled || !href) return;
    captureLiveSelection();
    editor.focus();
    restoreSelection();
    const selection = window.getSelection();
    const collapsed = !selection || selection.rangeCount === 0 || selection.isCollapsed;
    if (collapsed) {
      document.execCommand("insertHTML", false, `<a href="${href}">${href}</a>`);
    } else {
      document.execCommand("createLink", false, href);
    }
    setLinkUrl("");
    publish();
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

  const formatButtonClass = documentMode ? "h-8 w-8 px-0" : undefined;

  return (
    <div className={documentMode ? "overflow-hidden rounded-xl border bg-background shadow-sm" : "space-y-2"}>
      <div
        className={
          documentMode
            ? "flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-2 py-1.5"
            : "flex flex-wrap items-center gap-1"
        }
      >
        <Button
          type="button"
          variant={active.bold ? "secondary" : documentMode ? "ghost" : "outline"}
          size="sm"
          aria-pressed={active.bold}
          aria-label="Bold"
          title="Bold"
          className={formatButtonClass}
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("bold");
          }}
        >
          <Bold />
          {documentMode ? null : "Bold"}
        </Button>
        <Button
          type="button"
          variant={active.italic ? "secondary" : documentMode ? "ghost" : "outline"}
          size="sm"
          aria-pressed={active.italic}
          aria-label="Italic"
          title="Italic"
          className={formatButtonClass}
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("italic");
          }}
        >
          <Italic />
          {documentMode ? null : "Italic"}
        </Button>
        <Button
          type="button"
          variant={active.underline ? "secondary" : documentMode ? "ghost" : "outline"}
          size="sm"
          aria-pressed={active.underline}
          aria-label="Underline"
          title="Underline"
          className={formatButtonClass}
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("underline");
          }}
        >
          <Underline />
          {documentMode ? null : "Underline"}
        </Button>
        {allowLists && (
          <Button
            type="button"
            variant={active.list ? "secondary" : documentMode ? "ghost" : "outline"}
            size="sm"
            className={formatButtonClass}
            aria-pressed={active.list}
            aria-label="Bulleted list"
            title="Bulleted list"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              applyCommand("insertUnorderedList");
            }}
          >
            <List />
            {documentMode ? null : "Bullets"}
          </Button>
        )}
        <span className="mx-1 hidden h-6 w-px bg-border sm:inline-block" aria-hidden />
        {documentMode ? (
          <Button
            type="button"
            variant={colorsOpen ? "secondary" : "ghost"}
            size="sm"
            className={formatButtonClass}
            aria-label="Text color"
            aria-expanded={colorsOpen}
            title="Text color"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              rememberSelection();
              setLinkOpen(false);
              setColorsOpen((open) => !open);
            }}
          >
            <span className="flex flex-col items-center leading-none">
              <span className="text-sm font-semibold">A</span>
              <span className="mt-0.5 h-0.5 w-3.5 rounded-full bg-primary" />
            </span>
          </Button>
        ) : (
          <>
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
          </>
        )}
        {allowLinks && documentMode ? (
          <Button
            type="button"
            variant={linkOpen ? "secondary" : "ghost"}
            size="sm"
            className={formatButtonClass}
            aria-label="Link"
            aria-expanded={linkOpen}
            title="Link"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              rememberSelection();
              setColorsOpen(false);
              setLinkOpen((open) => !open);
            }}
          >
            <Link2 />
          </Button>
        ) : null}
        {allowLinks && !documentMode && (
          <>
            <span className="mx-1 hidden h-6 w-px bg-border sm:inline-block" aria-hidden />
            <Input
              value={linkUrl}
              disabled={disabled}
              placeholder="https://…"
              aria-label="Link address"
              className="h-8 w-44 font-mono text-xs"
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  insertLink();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || !linkUrl.trim()}
              onMouseDown={(event) => {
                event.preventDefault();
                insertLink();
              }}
            >
              <Link2 />
              Link
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={formatButtonClass}
          aria-label="Clear formatting"
          title="Clear formatting"
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("removeFormat");
          }}
        >
          <Eraser />
          {documentMode ? null : "Clear formatting"}
        </Button>
      </div>
      {documentMode && colorsOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          {COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              title={color.label}
              aria-label={`${color.label} text`}
              disabled={disabled}
              className="h-6 w-6 rounded-full border border-input disabled:opacity-50"
              style={{ backgroundColor: color.value }}
              onMouseDown={(event) => {
                event.preventDefault();
                applyCommand("foreColor", color.value);
                setColorsOpen(false);
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
        </div>
      )}
      {documentMode && linkOpen && (
        <form
          className="flex items-center gap-2 border-b px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            insertLink();
            setLinkOpen(false);
          }}
        >
          <Input
            value={linkUrl}
            disabled={disabled}
            placeholder="Paste a link"
            aria-label="Link address"
            autoFocus
            className="h-8 font-mono text-xs"
            onChange={(event) => setLinkUrl(event.target.value)}
          />
          <Button type="submit" size="sm" disabled={disabled || !linkUrl.trim()}>
            Apply
          </Button>
        </form>
      )}
      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label="About us"
        contentEditable={!disabled}
        suppressContentEditableWarning
        className={cn(
          documentMode ? documentEditorClassName : editorClassName,
          disabled && "cursor-not-allowed opacity-50"
        )}
        onFocus={() => {
          document.execCommand("defaultParagraphSeparator", false, "p");
        }}
        onMouseUp={rememberSelection}
        onKeyUp={rememberSelection}
        onInput={publish}
        onBlur={() => {
          const editor = editorRef.current;
          if (!editor) return;
          const clean = sanitizeIntakeAboutHtml(editor.innerHTML, { allowLinks });
          editor.innerHTML = clean;
          onChange(clean);
        }}
      />
    </div>
  );
}
