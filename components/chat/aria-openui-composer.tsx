"use client";

import {
  buildMessageContent,
  readComposerAttachment,
  type ComposerAttachment,
} from "@/lib/aria-composer-attachments";
import { useThread, useThreadList } from "@openuidev/react-headless";
import { ArrowUp, Plus, Square, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AriaAttentionPicker } from "@/components/chat/aria-attention-picker";
import { useTdevBeam } from "@/hooks/use-tdev-beam";
import { takeLandingDraft } from "@/lib/landing-draft";
import { cn } from "@/lib/utils";

const IME_KEY_CODE = 229;

function shouldSubmitOnEnter(event: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Enter" || event.shiftKey) return false;
  return !event.nativeEvent.isComposing && event.keyCode !== IME_KEY_CODE;
}

type AriaOpenUIComposerProps = {
  variant?: "thread" | "welcome";
  placeholder?: string;
  className?: string;
};

export function AriaOpenUIComposer({
  variant = "thread",
  placeholder = "Describe your question or task",
  className,
}: AriaOpenUIComposerProps) {
  const [textContent, setTextContent] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  useTdevBeam(beamRef);

  const processMessage = useThread((s) => s.processMessage);
  const cancelMessage = useThread((s) => s.cancelMessage);
  const isRunning = useThread((s) => s.isRunning);
  const isLoadingMessages = useThread((s) => s.isLoadingMessages);
  const selectedThreadId = useThreadList((s) => s.selectedThreadId);

  const isWelcome = variant === "welcome";
  const rootClass = isWelcome
    ? "openui-agent-desktop-welcome-composer"
    : "openui-agent-thread-composer";
  const inputClass = isWelcome
    ? "openui-agent-desktop-welcome-composer__input"
    : "openui-agent-thread-composer__input";
  const actionBarClass = isWelcome
    ? "openui-agent-desktop-welcome-composer__action-bar"
    : "openui-agent-thread-composer__action-bar";
  const submitClass = isWelcome
    ? "openui-agent-desktop-welcome-composer__submit-button"
    : "openui-agent-thread-composer__submit-button";

  const canSend = Boolean(textContent.trim() || attachments.length) && !isRunning && !isLoadingMessages;

  const handleSubmit = useCallback(() => {
    if (isRunning) {
      cancelMessage();
      return;
    }
    const content = buildMessageContent(textContent, attachments);
    if (!content || isLoadingMessages) return;
    processMessage({ role: "user", content });
    setTextContent("");
    setAttachments([]);
    setUploadError(null);
  }, [attachments, cancelMessage, isLoadingMessages, isRunning, processMessage, textContent]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "0px";
    input.style.height = `${Math.max(input.scrollHeight, 32)}px`;
  }, [textContent]);

  const [seenThreadId, setSeenThreadId] = useState(selectedThreadId);
  if (selectedThreadId !== seenThreadId) {
    setSeenThreadId(selectedThreadId);
    setTextContent("");
    setAttachments([]);
    setUploadError(null);
  }

  useEffect(() => {
    const onDraft = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      if (typeof text === "string" && text.trim()) {
        setTextContent(text);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    window.addEventListener("aria:composer-draft", onDraft);
    return () => window.removeEventListener("aria:composer-draft", onDraft);
  }, []);

  useEffect(() => {
    if (!isWelcome) return;
    const fromLanding = takeLandingDraft();
    const fromQuery = typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    const draft = fromLanding || fromQuery;
    // takeLandingDraft consumes sessionStorage once, so it cannot run during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setTextContent(draft);
  }, [isWelcome]);

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    try {
      const next: ComposerAttachment[] = [];
      for (const file of Array.from(files)) {
        next.push(await readComposerAttachment(file));
      }
      setAttachments((prev) => [...prev, ...next]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const composerInner = (
    <>
      {attachments.length > 0 ? (
        <div className="aria-openui-composer-files" aria-label="Attached files">
          {attachments.map((file) => (
            <span key={file.id} className="aria-openui-composer-file">
              <span className="aria-openui-composer-file__name">{file.name}</span>
              <button
                type="button"
                className="aria-openui-composer-file__remove"
                aria-label={`Remove ${file.name}`}
                onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== file.id))}
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {uploadError ? <p className="aria-openui-composer-error">{uploadError}</p> : null}

      <div
        className={cn(
          isWelcome ? undefined : "openui-agent-thread-composer__input-wrapper",
          "aria-openui-composer-field",
        )}
        data-drafting={textContent.length > 0 || attachments.length > 0 || undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          multiple
          accept="image/*,application/pdf,text/plain,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx"
          onChange={(e) => void onPickFiles(e.target.files)}
        />
        <textarea
          ref={inputRef}
          value={textContent}
          autoFocus={!isWelcome}
          onChange={(e) => setTextContent(e.target.value)}
          className={inputClass}
          placeholder={placeholder}
          rows={1}
          onKeyDown={(e) => {
            if (shouldSubmitOnEnter(e)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className={cn(actionBarClass, "aria-openui-composer-bar")}>
          <button
            type="button"
            className="aria-openui-composer-attach"
            aria-label="Upload files"
            disabled={isRunning || process.env.NEXT_PUBLIC_ARIA_PREVIEW !== "true"}
            title="File analysis is not connected yet"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={15} strokeWidth={2} aria-hidden />
          </button>
          <AriaAttentionPicker disabled={isRunning} />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isRunning && !canSend}
            aria-label={isRunning ? "Cancel message" : "Send message"}
            className={cn(
              submitClass,
              "aria-openui-composer-send",
              "openui-icon-button openui-icon-button-primary openui-icon-button-small openui-icon-button-square",
            )}
          >
            <span className="openui-icon-button-icon">
              {isRunning ? (
                <Square size="1em" fill="currentColor" aria-hidden />
              ) : (
                <ArrowUp size="1em" aria-hidden />
              )}
            </span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="aria-composer-beam" ref={beamRef}>
      <div
        className={cn(rootClass, "aria-openui-composer", className)}
        data-drafting={textContent.length > 0 || attachments.length > 0 || undefined}
        onClick={
          isWelcome
            ? undefined
            : (e) => {
                const target = e.target;
                if (
                  target instanceof Element &&
                  !target.closest("button, a, [role='button'], textarea, input")
                ) {
                  inputRef.current?.focus();
                }
              }
        }
      >
        {composerInner}
      </div>
    </div>
  );
}
