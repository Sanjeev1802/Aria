"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowUpIcon,
  FileIcon,
  PaperclipIcon,
  SmileIcon,
  XIcon,
} from "lucide-react";
import type { ChatAttachment } from "@/lib/aria/types";
import { createId } from "@/lib/aria/types";
import {
  estimateTokens,
  formatBytes,
  formatTokenCount,
} from "@/lib/aria/tokens";
import { EmojiPicker } from "@/components/chat/EmojiPicker";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPT =
  "image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

export type ComposerPayload = {
  content: string;
  attachments: ChatAttachment[];
};

type ChatComposerProps = {
  disabled?: boolean;
  tokensRemaining?: number;
  onSend: (payload: ComposerPayload) => void;
};

async function fileToAttachment(file: File): Promise<ChatAttachment> {
  const id = createId("file");
  const base: ChatAttachment = {
    id,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
  };

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`“${file.name}” is larger than 5 MB.`);
  }

  if (file.type.startsWith("image/") || file.size <= 256 * 1024) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
    return { ...base, dataUrl };
  }

  return base;
}

export function ChatComposer({
  disabled,
  tokensRemaining = Infinity,
  onSend,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  const draftTokens = estimateTokens(value, attachments);
  const overBudget = draftTokens > tokensRemaining;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setValue((v) => v + emoji);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    const incoming = Array.from(fileList);
    if (attachments.length + incoming.length > MAX_FILES) {
      setError(`You can attach up to ${MAX_FILES} files.`);
      return;
    }
    try {
      const next = await Promise.all(incoming.map(fileToAttachment));
      setAttachments((prev) => [...prev, ...next]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function submit() {
    const next = value.trim();
    if ((!next && attachments.length === 0) || disabled || overBudget) return;
    onSend({ content: next || "Shared files", attachments });
    setValue("");
    setAttachments([]);
    setError(null);
    setEmojiOpen(false);
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

  const canSend =
    (value.trim().length > 0 || attachments.length > 0) &&
    !disabled &&
    !overBudget;

  return (
    <div className="shrink-0 border-t border-foreground/10 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-4">
      <form
        onSubmit={handleSubmit}
        className="relative mx-auto flex w-full max-w-[40rem] flex-col gap-2 rounded-2xl border border-foreground/12 bg-background px-2.5 py-2 shadow-sm focus-within:border-foreground/25"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
      >
        {attachments.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 px-0.5 pt-0.5">
            {attachments.map((file) => (
              <li
                key={file.id}
                className="group relative flex max-w-[11rem] items-center gap-1.5 rounded-xl border border-foreground/10 bg-card px-2 py-1.5"
              >
                {file.dataUrl && file.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.dataUrl}
                    alt=""
                    className="size-7 rounded-md object-cover"
                  />
                ) : (
                  <FileIcon className="size-3.5 shrink-0 text-foreground/45" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-foreground/40">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(file.id)}
                  className="inline-flex size-5 items-center justify-center rounded-md text-foreground/40 hover:bg-foreground/5 hover:text-foreground"
                  aria-label={`Remove ${file.name}`}
                >
                  <XIcon className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-end gap-1">
          <div className="relative flex shrink-0 items-center gap-0.5 pb-0.5">
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              disabled={disabled}
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={disabled || attachments.length >= MAX_FILES}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex size-7 items-center justify-center rounded-lg text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-40"
              aria-label="Upload files"
              title="Upload files"
            >
              <PaperclipIcon className="size-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setEmojiOpen((v) => !v)}
              className="inline-flex size-7 items-center justify-center rounded-lg text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-40"
              aria-label="Insert emoji"
              aria-expanded={emojiOpen}
              title="Emoji"
            >
              <SmileIcon className="size-4" strokeWidth={1.75} />
            </button>
            <EmojiPicker
              open={emojiOpen}
              onClose={() => setEmojiOpen(false)}
              onSelect={insertEmoji}
            />
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Message Aria…"
            className="max-h-[8.75rem] min-h-[28px] w-full flex-1 resize-none bg-transparent py-1.5 text-[13px] leading-5 text-foreground outline-none placeholder:text-foreground/35 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={`mb-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
              canSend
                ? "bg-accent text-white hover:opacity-90"
                : "bg-foreground/5 text-foreground/25"
            }`}
          >
            <ArrowUpIcon className="size-3.5" strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 px-0.5 pb-0.5">
          <p className="text-[10px] text-foreground/35">
            Enter to send · Shift+Enter for new line · drop files here
          </p>
          <p
            className={`shrink-0 text-[10px] tabular-nums ${
              overBudget ? "font-medium text-red-700" : "text-foreground/40"
            }`}
          >
            ~{formatTokenCount(draftTokens)} tokens
            {Number.isFinite(tokensRemaining)
              ? ` · ${formatTokenCount(Math.max(0, tokensRemaining))} left`
              : null}
          </p>
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="mx-auto mt-1.5 max-w-[40rem] text-center text-[11px] text-red-700"
        >
          {error}
        </p>
      ) : (
        <p className="mx-auto mt-1.5 max-w-[40rem] text-center text-[10px] text-foreground/35">
          Aria can make mistakes. Verify important information.
        </p>
      )}
    </div>
  );
}
