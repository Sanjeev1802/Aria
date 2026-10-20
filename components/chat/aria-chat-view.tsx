"use client";

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { ScrollButton } from "@/components/prompt-kit/scroll-button";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { ChatMessage } from "@/lib/chat-preview";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  Copy,
  Globe,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react";
import { useState } from "react";

export type AriaChatViewProps = {
  title: string;
  messages: ChatMessage[];
  isRunning: boolean;
  thinking: boolean;
  onSend: (text: string) => void | Promise<void>;
  onCancel: () => void;
  onDeleteMessage?: (id: string) => void;
};

export function AriaChatView({
  title,
  messages,
  isRunning,
  thinking,
  onSend,
  onCancel,
  onDeleteMessage,
}: AriaChatViewProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    const text = prompt.trim();
    if (!text || isRunning) return;
    setPrompt("");
    void onSend(text);
  };

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* preview */
    }
  }

  const showWelcome = messages.length === 0 && !thinking && !isRunning;

  return (
    <main className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="text-foreground truncate">{title}</div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {showWelcome && (
              <p className="text-muted-foreground mx-auto w-full max-w-3xl px-6 text-center text-lg">
                Ask anything to get started.
              </p>
            )}

            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              const isLastMessage = index === messages.length - 1;
              const showAssistantBody =
                message.content.length > 0 || (thinking && isLastMessage && isRunning);

              return (
                <Message
                  key={message.id}
                  className={cn(
                    "mx-auto mb-8 flex w-full max-w-3xl flex-col gap-2 px-6",
                    isAssistant ? "items-start" : "items-end",
                  )}
                >
                  {isAssistant ? (
                    <div className="group flex w-full flex-col gap-0">
                      {showAssistantBody && (
                        <MessageContent
                          className="text-foreground prose dark:prose-invert max-w-none flex-1 rounded-lg bg-transparent p-0 shadow-none"
                          markdown={Boolean(message.content)}
                        >
                          {message.content || "…"}
                        </MessageContent>
                      )}
                      {message.content && (
                        <MessageActions
                          className={cn(
                            "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                            isLastMessage && !isRunning && "opacity-100",
                          )}
                        >
                          <MessageAction tooltip="Copy" delayDuration={100}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={() => void copyText(message.content)}
                            >
                              <Copy />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Upvote" delayDuration={100}>
                            <Button type="button" variant="ghost" size="icon" className="rounded-full">
                              <ThumbsUp />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Downvote" delayDuration={100}>
                            <Button type="button" variant="ghost" size="icon" className="rounded-full">
                              <ThumbsDown />
                            </Button>
                          </MessageAction>
                        </MessageActions>
                      )}
                    </div>
                  ) : (
                    <div className="group flex flex-col items-end gap-1">
                      <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl border-0 px-5 py-2.5 shadow-none sm:max-w-[75%]">
                        {message.content}
                      </MessageContent>
                      <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <MessageAction tooltip="Edit" delayDuration={100}>
                          <Button type="button" variant="ghost" size="icon" className="rounded-full">
                            <Pencil />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Delete" delayDuration={100}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => onDeleteMessage?.(message.id)}
                          >
                            <Trash />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Copy" delayDuration={100}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => void copyText(message.content)}
                          >
                            <Copy />
                          </Button>
                        </MessageAction>
                      </MessageActions>
                    </div>
                  )}
                </Message>
              );
            })}
          </ChatContainerContent>

          <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerRoot>
      </div>

      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            isLoading={isRunning}
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={handleSubmit}
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-2 shadow-xs"
          >
            <div className="flex flex-col gap-1">
              <PromptInputTextarea
                placeholder="Ask anything"
                className="px-2 text-[15px] leading-snug md:text-[15px]"
              />

              <PromptInputActions className="flex w-full items-center justify-between gap-2 px-0.5 pb-0.5 pt-0">
                <div className="flex items-center gap-1.5">
                  <PromptInputAction tooltip="Add a new action">
                    <Button type="button" variant="outline" size="icon" className="size-8 rounded-full">
                      <Plus size={16} />
                    </Button>
                  </PromptInputAction>
                  <PromptInputAction tooltip="Search">
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-2.5 text-xs">
                      <Globe size={16} />
                      Search
                    </Button>
                  </PromptInputAction>
                  <PromptInputAction tooltip="More actions">
                    <Button type="button" variant="outline" size="icon" className="size-8 rounded-full">
                      <MoreHorizontal size={16} />
                    </Button>
                  </PromptInputAction>
                </div>
                <div className="flex items-center gap-1.5">
                  <PromptInputAction tooltip="Voice input">
                    <Button type="button" variant="outline" size="icon" className="size-8 rounded-full">
                      <Mic size={16} />
                    </Button>
                  </PromptInputAction>

                  {isRunning ? (
                    <Button
                      type="button"
                      size="icon"
                      className="size-8 rounded-full"
                      aria-label="Stop generating"
                      onClick={onCancel}
                    >
                      <span className="size-3 rounded-xs bg-white" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      disabled={!prompt.trim()}
                      onClick={handleSubmit}
                      className="size-8 rounded-full"
                    >
                      <ArrowUp size={16} />
                    </Button>
                  )}
                </div>
              </PromptInputActions>
            </div>
          </PromptInput>
        </div>
      </div>
    </main>
  );
}
