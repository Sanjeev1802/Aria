"use client";

import { useEffect, useRef } from "react";

const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "😊",
  "😍",
  "🤔",
  "😎",
  "🙌",
  "👍",
  "👎",
  "👏",
  "🔥",
  "✨",
  "💡",
  "📌",
  "✅",
  "❌",
  "⚠️",
  "📊",
  "📈",
  "📁",
  "📎",
  "📝",
  "🧠",
  "🚀",
  "💼",
  "🎯",
  "⭐",
  "❤️",
  "🙏",
];

type EmojiPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
};

export function EmojiPicker({ open, onClose, onSelect }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label="Emoji picker"
      className="absolute bottom-full left-0 z-30 mb-2 w-[220px] rounded-2xl border border-foreground/10 bg-background p-2 shadow-lg"
    >
      <div className="grid grid-cols-6 gap-0.5">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="option"
            className="flex size-8 items-center justify-center rounded-lg text-base transition-colors hover:bg-foreground/5"
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
