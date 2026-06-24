"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardSectionId } from "@/lib/dashboard/sections";
import { SECTION_LABELS } from "@/lib/dashboard/sections";

interface DashboardSectionShellProps {
  id: DashboardSectionId;
  collapsed: boolean;
  onToggleCollapsed: (id: DashboardSectionId) => void;
  onDragStart: (id: DashboardSectionId) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (id: DashboardSectionId) => void;
  isDragging: boolean;
  isDropTarget: boolean;
  children: React.ReactNode;
}

export function DashboardSectionShell({
  id,
  collapsed,
  onToggleCollapsed,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDropTarget,
  children,
}: DashboardSectionShellProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg transition-opacity",
        isDragging && "opacity-40",
        (isDropTarget || dragOver) && "ring-2 ring-primary/40 ring-offset-2"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
        onDragOver(event);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        onDrop(id);
      }}
    >
      <div className="flex gap-2">
        <button
          type="button"
          draggable
          onDragStart={() => onDragStart(id)}
          className={cn(
            "mt-3 flex h-9 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border bg-muted/50 text-muted-foreground hover:bg-muted active:cursor-grabbing",
            collapsed && "mt-2"
          )}
          aria-label={`Drag to reorder ${SECTION_LABELS[id]}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          {collapsed ? (
            <button
              type="button"
              onClick={() => onToggleCollapsed(id)}
              className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left shadow-sm hover:bg-muted/30"
            >
              <span className="font-medium text-sm">{SECTION_LABELS[id]}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <div className="relative">
              <div className="absolute right-2 top-2 z-10">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToggleCollapsed(id)}
                  aria-label={`Collapse ${SECTION_LABELS[id]}`}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
