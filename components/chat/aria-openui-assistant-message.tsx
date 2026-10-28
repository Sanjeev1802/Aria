"use client";

import { AriaMark } from "@/components/aria-mark";
import { AriaEvidenceSources } from "@/components/chat/aria-evidence-sources";
import { AriaWebSources } from "@/components/chat/aria-web-sources";
import { splitWebSources } from "@/lib/aria-web-sources";
import { getLastAssistantMessageId, readMessage } from "@/lib/openui-message-utils";
import { useAssistantMessageSources } from "@/lib/use-assistant-message-sources";
import type { AssistantMessage } from "@openuidev/react-headless";
import { useThread } from "@openuidev/react-headless";
import { runChatAction } from "@/lib/aria-openui-chat-action";
import { buildMessage, Renderer, type ActionEvent } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui";
import { useCallback, useMemo } from "react";

export type AriaOpenUIAssistantMessageProps = {
  message: AssistantMessage;
  isStreaming?: boolean;
};

export function AriaOpenUIAssistantMessage({
  message,
  isStreaming: isStreamingProp,
}: AriaOpenUIAssistantMessageProps) {
  const messages = useThread((s) => s.messages);
  const isRunning = useThread((s) => s.isRunning);
  const processMessage = useThread((s) => s.processMessage);
  const updateMessage = useThread((s) => s.updateMessage);

  const lastAssistantId = useMemo(() => getLastAssistantMessageId(messages), [messages]);
  const isStreaming =
    isStreamingProp ?? (isRunning && lastAssistantId === message.id);

  const sources = useAssistantMessageSources(message.id);
  const showSources = sources.length > 0 && !isStreaming;

  const { content, context, attributes } = useMemo(
    () =>
      message.content
        ? readMessage(message.content, isStreaming)
        : { content: null, context: null, attributes: {} },
    [message.content, isStreaming],
  );

  // Cited web pages come back as a text list under the answer; show them as source chips instead.
  const webSplit = useMemo(() => (content ? splitWebSources(content, isStreaming) : { body: "", sources: [] }),
    [content, isStreaming]);

  const initialState = useMemo(() => {
    if (Array.isArray(context) && typeof context[0] === "object") return context[0];
    if (context && typeof context === "object" && !Array.isArray(context)) return context;
    return undefined;
  }, [context]);

  const handleStateUpdate = useCallback(
    (state: Record<string, unknown>) => {
      const hasState = Object.keys(state).length > 0;
      const fullMessage = buildMessage({
        content: content ?? "",
        attributes,
        context: hasState ? [state] : undefined,
      });
      updateMessage({ ...message, content: fullMessage });
    },
    [updateMessage, message, content, attributes],
  );

  const handleAction = useCallback(
    (event: ActionEvent) => {
      runChatAction(event, (content) => processMessage({ role: "user", content }));
    },
    [processMessage],
  );

  return (
    <div className="openui-shell-thread-message-assistant aria-openui-assistant-message">
      <span
        className="openui-shell-thread-message-assistant__logo aria-openui-reply-avatar"
        aria-hidden
      >
        <AriaMark className="aria-openui-reply-avatar__mark" />
      </span>
      <div className="openui-shell-thread-message-assistant__content flex flex-col gap-2">
        {content ? (
          <Renderer
            response={webSplit.body}
            library={openuiChatLibrary}
            isStreaming={isStreaming}
            onAction={handleAction}
            onStateUpdate={handleStateUpdate}
            initialState={initialState}
          />
        ) : null}
        {webSplit.sources.length ? <AriaWebSources sources={webSplit.sources} /> : null}
        {showSources ? (
          <AriaEvidenceSources sources={sources} className="aria-openui-assistant-message__sources" />
        ) : null}
      </div>
    </div>
  );
}
