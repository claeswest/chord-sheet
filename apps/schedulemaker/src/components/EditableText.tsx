"use client";

// Click a piece of the sheet, type over it, click away.
//
// One field becomes an input at a time and turns back into text on blur, so
// the printed document is never a page full of form controls. contentEditable
// would avoid the swap but fights React over the cursor, and a caret that
// jumps to the start on every keystroke is worse than a click.

import { useEffect, useRef, useState } from "react";

export default function EditableText({
  value,
  onChange,
  editable,
  placeholder,
  className,
  as: Tag = "span",
}: {
  value: string;
  onChange: (next: string) => void;
  editable: boolean;
  placeholder?: string;
  className?: string;
  as?: "span" | "p" | "h1" | "h2";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLInputElement>(null);

  // The schedule can change underneath — a new photo, an undo — and a stale
  // draft would quietly overwrite it on the next blur.
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={input}
        className={`inline-edit ${className ?? ""}`}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onChange(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <Tag
      className={`${className ?? ""} ${editable ? "editable" : ""}`}
      onClick={editable ? () => setEditing(true) : undefined}
      // Keyboard reaches it too: this is the only way to change a title.
      tabIndex={editable ? 0 : undefined}
      role={editable ? "button" : undefined}
      onKeyDown={
        editable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEditing(true);
              }
            }
          : undefined
      }
    >
      {value || (editable ? <span className="placeholder">{placeholder}</span> : "")}
    </Tag>
  );
}
