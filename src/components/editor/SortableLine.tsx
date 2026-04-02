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
      className="group/row flex items-start gap-1"
    >
      {/* Drag handle — visible on row hover */}
      <button
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 transition-opacity shrink-0 mt-1 px-0.5 touch-none"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="3" cy="3"  r="1.5" />
          <circle cx="7" cy="3"  r="1.5" />
          <circle cx="3" cy="8"  r="1.5" />
          <circle cx="7" cy="8"  r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="7" cy="13" r="1.5" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
