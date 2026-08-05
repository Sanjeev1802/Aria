"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowUpIcon, PlusIcon } from "lucide-react";

type ChatComposerProps = {
  disabled?: boolean;
  onSend: (value: string) => void;
};

export function ChatComposer({ disabled, onSend }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  function submit() {
    const next = value.trim();
    if (!next || disabled) return;
    onSend(next);
    setValue("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="shrink-0 border-t border-[#161616] px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-4">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-[40rem] items-end gap-1.5 rounded-xl border border-[#222] bg-[#111] px-2 py-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus-within:border-[#333]"
      >
        <button
          type="button"
          className="mb-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#1a1a1a] hover:text-[#e5e5e5]"
          aria-label="Add attachment"
        >
          <PlusIcon className="size-4" strokeWidth={1.75} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Message Aria…"
          className="max-h-[7.5rem] min-h-[28px] w-full flex-1 resize-none bg-transparent py-1.5 text-[13px] leading-5 text-[#f5f5f5] outline-none placeholder:text-[#525252] disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className={`mb-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${
            canSend
              ? "bg-[#d88a68] text-[#141413] hover:opacity-90"
              : "bg-[#1a1a1a] text-[#404040]"
          }`}
        >
          <ArrowUpIcon className="size-3.5" strokeWidth={2.25} />
        </button>
      </form>
      <p className="mx-auto mt-1.5 max-w-[40rem] text-center text-[10px] text-[#404040]">
        Aria can make mistakes. Verify important information.
      </p>
    </div>
  );
}
