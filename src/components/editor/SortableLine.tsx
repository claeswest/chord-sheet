"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  id: string;
  children: React.ReactNode;
}

export default function SortableLine({ id, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="group/row flex items-center gap-1"
    >
      {/* Drag handle — visible on row hover */}
      <button
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing text-[#302b63]/50 hover:text-[#302b63] transition-opacity shrink-0 touch-none rounded-md bg-[#302b63]/10 shadow-sm border border-[#302b63]/20 p-1"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
          <circle cx="3.5" cy="3"  r="2" />
          <circle cx="8.5" cy="3"  r="2" />
          <circle cx="3.5" cy="9"  r="2" />
          <circle cx="8.5" cy="9"  r="2" />
          <circle cx="3.5" cy="15" r="2" />
          <circle cx="8.5" cy="15" r="2" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
