"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/aria/types";
import { formatBytes, formatTokenCount } from "@/lib/aria/tokens";
import { AriaLogo } from "@/components/chat/AriaLogo";
import { CheckIcon, CopyIcon, FileIcon } from "lucide-react";

export function ChatMessageRow({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const attachments = message.attachments ?? [];
  const tokens = message.tokens;

  return (
    <div className={`group flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
      {attachments.length > 0 ? (
        <ul
          className={`flex flex-wrap gap-1.5 ${isUser ? "justify-end" : "justify-start"}`}
        >
          {attachments.map((file) => (
            <li
              key={file.id}
              className={`flex max-w-[12rem] items-center gap-1.5 rounded-xl border px-2 py-1.5 ${
                isUser
                  ? "border-background/20 bg-foreground text-background"
                  : "border-foreground/10 bg-background text-foreground"
              }`}
            >
              {file.dataUrl && file.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="size-8 rounded-md object-cover"
                />
              ) : (
                <FileIcon
                  className={`size-3.5 shrink-0 ${isUser ? "opacity-70" : "text-foreground/45"}`}
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium">{file.name}</p>
                <p
                  className={`text-[10px] ${isUser ? "opacity-60" : "text-foreground/40"}`}
                >
                  {formatBytes(file.size)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {isUser ? (
        <div className="flex max-w-[85%] flex-col items-end gap-1">
          <p className="whitespace-pre-wrap rounded-2xl bg-foreground px-3.5 py-2 text-right text-[13px] leading-5 text-background">
            {message.content}
          </p>
        </div>
      ) : (
        <div className="flex w-full gap-2.5">
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-background">
            <AriaLogo className="h-3.5 w-auto text-accent" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="whitespace-pre-wrap font-serif text-[14px] leading-relaxed text-foreground/80">
              {message.content}
            </div>
            {message.sources && message.sources.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {message.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center truncate rounded-full border border-foreground/10 bg-background px-2.5 py-1 text-[11px] text-foreground/55 transition-colors hover:border-foreground/20 hover:text-foreground"
                    title={source.title}
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div
        className={`flex items-center gap-2 px-0.5 ${isUser ? "flex-row-reverse" : "pl-8"}`}
      >
        {tokens ? (
          <p className="text-[10px] tabular-nums text-foreground/35">
            {isUser
              ? `${formatTokenCount(tokens.prompt)} prompt`
              : `${formatTokenCount(tokens.completion)} completion`}
            <span className="text-foreground/25">
              {" "}
              · {formatTokenCount(tokens.total)} total
            </span>
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void copyContent()}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-foreground/40 opacity-0 transition-opacity hover:bg-foreground/5 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Copy message"
        >
          {copied ? (
            <CheckIcon className="size-3 text-accent" />
          ) : (
            <CopyIcon className="size-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
