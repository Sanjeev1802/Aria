"use client";

import {
  buildMessageContent,
  readComposerAttachment,
  type ComposerAttachment,
} from "@/lib/aria-composer-attachments";
import { useThread, useThreadList } from "@openuidev/react-headless";
import { ArrowUp, Plus, Square, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { selectAriaModel } from "@/lib/aria-openui-llm";
import { useAriaSession } from "@/lib/aria-session";
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
  placeholder = "Ask anything...",
  className,
}: AriaOpenUIComposerProps) {
  const [textContent, setTextContent] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [model, setModel] = useState<"nova" | "claude">("nova");
  const allowedModels = useAriaSession().entitlements?.models;
  const claudeAllowed = !allowedModels || allowedModels.includes("claude");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!claudeAllowed && model === "claude") { setModel("nova"); selectAriaModel("nova"); }
  }, [claudeAllowed, model]);

  const canSend = Boolean(textContent.trim() || attachments.length) && !isRunning && !isLoadingMessages;

  const handleSubmit = useCallback(() => {
    if (isRunning) {
      cancelMessage();
      return;
    }
    const content = buildMessageContent(textContent, attachments);
    if (!content || isLoadingMessages) return;
    selectAriaModel(model);
    processMessage({ role: "user", content });
    setTextContent("");
    setAttachments([]);
    setUploadError(null);
  }, [attachments, cancelMessage, isLoadingMessages, isRunning, processMessage, textContent, model]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "0px";
    input.style.height = `${Math.max(input.scrollHeight, 32)}px`;
  }, [textContent]);

  useLayoutEffect(() => {
    setTextContent("");
    setAttachments([]);
    setUploadError(null);
  }, [selectedThreadId]);

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
        <button
          type="button"
          className="aria-openui-composer-attach"
          aria-label="Upload files"
          disabled={isRunning || process.env.NEXT_PUBLIC_ARIA_PREVIEW !== "true"}
          title="File analysis is not connected yet"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus size={18} strokeWidth={2} aria-hidden />
        </button>

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

        <div className={actionBarClass}>
          <select
            aria-label="AI model"
            value={model}
            disabled={isRunning}
            onChange={event => {
              const next = event.target.value === "claude" ? "claude" : "nova";
              setModel(next);
              selectAriaModel(next);
            }}
            className="max-w-28 rounded-md bg-transparent p-1 text-xs text-muted-foreground"
          >
            <option value="nova">Amazon Nova</option>
            <option value="claude" disabled={!claudeAllowed}>{claudeAllowed ? "Claude" : "Claude · Pro"}</option>
          </select>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isRunning && !canSend}
            aria-label={isRunning ? "Cancel message" : "Send message"}
            className={cn(
              submitClass,
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

  if (isWelcome) {
    return (
      <div
        className={cn(rootClass, "aria-openui-composer", className)}
        data-drafting={textContent.length > 0 || attachments.length > 0 || undefined}
      >
        {composerInner}
      </div>
    );
  }

  return (
    <div
      className={cn(rootClass, "aria-openui-composer", className)}
      data-drafting={textContent.length > 0 || attachments.length > 0 || undefined}
      onClick={(e) => {
        const target = e.target;
        if (
          target instanceof Element &&
          !target.closest("button, a, [role='button'], textarea, input")
        ) {
          inputRef.current?.focus();
        }
      }}
    >
      {composerInner}
    </div>
  );
}
