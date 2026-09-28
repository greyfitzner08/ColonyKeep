"use client";

import { Component, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { Bold, Eraser, Italic, Link2, List, Underline } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_LINE_SPACING,
  LINE_SPACINGS,
  normalizeLineHeight,
  sanitizeIntakeAboutHtml,
  type LineSpacing,
} from "@/lib/intake-about-html";
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
  "min-h-[22rem] w-full bg-background px-6 py-5 text-[15px] leading-[1.15] outline-none [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_li]:my-0 [&_p]:my-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6";

type EditorHandlers = {
  onInput: () => void;
  onBlur: () => void;
  onFocus: () => void;
  onMouseUp: () => void;
  onKeyUp: () => void;
};

/** Stays mounted so React re-renders do not wipe what the user typed. */
class FrozenEditor extends Component<{
  editorRef: RefObject<HTMLDivElement | null>;
  handlersRef: MutableRefObject<EditorHandlers>;
  className: string;
  id: string;
}> {
  shouldComponentUpdate() {
    return false;
  }

  render() {
    const { editorRef, handlersRef, className, id } = this.props;
    return (
      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label="About us"
        contentEditable
        suppressContentEditableWarning
        className={className}
        onFocus={() => handlersRef.current.onFocus()}
        onMouseUp={() => handlersRef.current.onMouseUp()}
        onKeyUp={() => handlersRef.current.onKeyUp()}
        onInput={() => handlersRef.current.onInput()}
        onBlur={() => handlersRef.current.onBlur()}
      />
    );
  }
}

export type IntakeAboutEditorHandle = {
  getHtml: () => string;
  setHtml: (html: string) => void;
};

export const IntakeAboutEditor = forwardRef<
  IntakeAboutEditorHandle,
  {
    id: string;
    value: string;
    disabled?: boolean;
    onChange: (value: string) => void;
    allowLinks?: boolean;
    allowLists?: boolean;
    variant?: "plain" | "document";
  }
>(function IntakeAboutEditor({
  id,
  value,
  disabled,
  onChange,
  allowLinks = false,
  allowLists = false,
  variant = "plain",
}, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const lastPublished = useRef<string | null>(null);
  const handlersRef = useRef<EditorHandlers>({
    onInput: () => undefined,
    onBlur: () => undefined,
    onFocus: () => undefined,
    onMouseUp: () => undefined,
    onKeyUp: () => undefined,
  });
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [spacingOpen, setSpacingOpen] = useState(false);
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>(
    () => normalizeLineHeight(value) ?? DEFAULT_LINE_SPACING
  );
  const lineSpacingRef = useRef(lineSpacing);
  lineSpacingRef.current = lineSpacing;
  const [active, setActive] = useState({ bold: false, italic: false, underline: false, list: false });
  const documentMode = variant === "document";

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.contentEditable = disabled ? "false" : "true";
  }, [disabled]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const clean = sanitizeIntakeAboutHtml(value, { allowLinks });
    if (lastPublished.current === null) {
      editor.innerHTML = clean;
      editor.style.lineHeight = documentMode ? lineSpacingRef.current : "";
      lastPublished.current = value;
      return;
    }
    if (value === lastPublished.current) return;
    if (sanitizeIntakeAboutHtml(lastPublished.current, { allowLinks }) === clean) {
      lastPublished.current = value;
      return;
    }
    if (document.activeElement === editor) return;
    editor.innerHTML = clean;
    lastPublished.current = value;
  }, [allowLinks, documentMode, value]);

  useImperativeHandle(ref, () => ({
    getHtml() {
      const editor = editorRef.current;
      if (editor && documentMode) stampLineSpacing(editor, lineSpacingRef.current);
      return sanitizeIntakeAboutHtml(editor?.innerHTML ?? "", { allowLinks });
    },
    setHtml(html: string) {
      const editor = editorRef.current;
      const clean = sanitizeIntakeAboutHtml(html, { allowLinks });
      const spacing = normalizeLineHeight(clean) ?? DEFAULT_LINE_SPACING;
      lineSpacingRef.current = spacing;
      setLineSpacing(spacing);
      if (editor) {
        editor.innerHTML = clean;
        if (documentMode) editor.style.lineHeight = spacing;
      }
      lastPublished.current = clean;
      onChange(clean);
    },
  }));

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
    savedRange.current = range.cloneRange();
  }

  function restoreSelection() {
    const range = savedRange.current;
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    try {
      selection?.addRange(range);
    } catch {
      savedRange.current = null;
    }
  }

  function stampLineSpacing(root: HTMLElement, spacing: LineSpacing) {
    root.style.lineHeight = spacing;
    root.querySelectorAll<HTMLElement>("p, li, div").forEach((node) => {
      node.style.lineHeight = spacing;
    });
  }

  function publish() {
    const editor = editorRef.current;
    if (!editor) return;
    if (documentMode) stampLineSpacing(editor, lineSpacingRef.current);
    lastPublished.current = editor.innerHTML;
    onChange(editor.innerHTML);
  }

  function chooseLineSpacing(spacing: LineSpacing) {
    lineSpacingRef.current = spacing;
    setLineSpacing(spacing);
    const editor = editorRef.current;
    if (!editor || disabled) return;
    stampLineSpacing(editor, spacing);
    setSpacingOpen(false);
    publish();
  }

  handlersRef.current = {
    onInput: publish,
    onBlur() {
      const editor = editorRef.current;
      if (!editor) return;
      const clean = sanitizeIntakeAboutHtml(editor.innerHTML, { allowLinks });
      lastPublished.current = clean;
      onChange(clean);
    },
    onFocus() {
      document.execCommand("defaultParagraphSeparator", false, "p");
    },
    onMouseUp: rememberSelection,
    onKeyUp: rememberSelection,
  };

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
    const safeHref = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    if (collapsed) {
      document.execCommand("insertHTML", false, `<a href="${safeHref}">${safeHref}</a>`);
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
    const range = savedRange.current?.cloneRange() ?? null;
    document.execCommand(command, false, commandValue);
    if (range && !range.collapsed) savedRange.current = range;
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
        {documentMode && (
          <Button
            type="button"
            variant={spacingOpen ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2 text-xs tabular-nums"
            aria-label="Line spacing"
            aria-expanded={spacingOpen}
            title="Line spacing"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              rememberSelection();
              setLinkOpen(false);
              setColorsOpen(false);
              setSpacingOpen((open) => !open);
            }}
          >
            {lineSpacing}
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
              setSpacingOpen(false);
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
              setSpacingOpen(false);
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
      {documentMode && spacingOpen && (
        <div className="flex flex-wrap items-center gap-1 border-b px-3 py-2">
          <span className="mr-1 text-xs text-muted-foreground">Line spacing</span>
          {LINE_SPACINGS.map((spacing) => (
            <Button
              key={spacing}
              type="button"
              size="sm"
              variant={lineSpacing === spacing ? "secondary" : "ghost"}
              className="h-8 px-2 text-xs tabular-nums"
              aria-pressed={lineSpacing === spacing}
              disabled={disabled}
              onMouseDown={(event) => {
                event.preventDefault();
                chooseLineSpacing(spacing);
              }}
            >
              {spacing}
            </Button>
          ))}
        </div>
      )}
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
      <FrozenEditor
        id={id}
        editorRef={editorRef}
        handlersRef={handlersRef}
        className={cn(
          documentMode ? documentEditorClassName : editorClassName,
          disabled && "cursor-not-allowed opacity-50"
        )}
      />
    </div>
  );
});
