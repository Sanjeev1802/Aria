"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import type { ChatMessage, ChatMode } from "@/lib/chat-preview";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { ShieldCheck } from "lucide-react";
import { useCallback, useRef, type FC } from "react";

function textFromAppend(message: AppendMessage): string {
  const content = message.content as string | readonly { type: string; text?: string }[];
  if (typeof content === "string") return content.trim();
  return content
    .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
}

function convertChatMessage(m: ChatMessage, streamingId: string | null): ThreadMessageLike {
  const streaming = m.role === "assistant" && m.id === streamingId;
  const status =
    m.role === "assistant"
      ? streaming
        ? { type: "running" as const }
        : m.content
          ? { type: "complete" as const, reason: "stop" as const }
          : undefined
      : undefined;

  return {
    id: m.id,
    role: m.role,
    content: [{ type: "text", text: m.content }],
    status,
  };
}

const ChatGptThreadWelcome: FC = () => (
  <div className="aui-thread-welcome-root mb-4 flex flex-col items-center px-2 text-center">
    <p className="aui-thread-welcome-message-inner">Where should we begin?</p>
  </div>
);

export type AriaChatThreadPanelProps = {
  messages: ChatMessage[];
  mode: ChatMode;
  streamingId: string | null;
  isRunning: boolean;
  onSend: (text: string) => Promise<void>;
  onCancel: () => void;
  onSetMessages: (messages: ChatMessage[]) => void;
};

function AriaChatThreadInner({
  messages,
  mode,
  streamingId,
  isRunning,
  onSend,
  onCancel,
  onSetMessages,
}: AriaChatThreadPanelProps) {
  const onSendRef = useRef(onSend);
  const onCancelRef = useRef(onCancel);
  const onSetMessagesRef = useRef(onSetMessages);
  onSendRef.current = onSend;
  onCancelRef.current = onCancel;
  onSetMessagesRef.current = onSetMessages;

  const convertMessage = useCallback(
    (m: ChatMessage) => convertChatMessage(m, streamingId),
    [streamingId],
  );

  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage,
    isRunning,
    onNew: async (message) => {
      const text = textFromAppend(message);
      if (!text) return;
      await onSendRef.current(text);
    },
    onCancel: async () => {
      onCancelRef.current();
    },
    setMessages: (next) => {
      onSetMessagesRef.current([...next]);
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="aria-chat-thread flex h-full min-h-0 flex-col">
        {mode === "intelligence" && (
          <div className="border-border bg-background/90 shrink-0 border-b px-4 py-2.5 backdrop-blur-md">
            <div className="text-muted-foreground mx-auto flex max-w-[44rem] gap-2 text-xs leading-relaxed">
              <ShieldCheck size={14} className="text-foreground mt-0.5 shrink-0" />
              <span>
                Intelligence uses approved datasets and documents. Aggregates below k=50 are withheld.
                Illustrative sources only in this preview.
              </span>
            </div>
          </div>
        )}
        <div className="min-h-0 flex-1">
          <Thread
            components={{
              Welcome: ChatGptThreadWelcome,
            }}
          />
        </div>
        <p className="text-muted-foreground shrink-0 px-4 pb-3 text-center text-[10px]">
          Simulated streaming · no live Bedrock call · credits not deducted
        </p>
      </div>
    </AssistantRuntimeProvider>
  );
}

export function AriaChatThreadPanel(props: AriaChatThreadPanelProps) {
  return <AriaChatThreadInner {...props} />;
}
