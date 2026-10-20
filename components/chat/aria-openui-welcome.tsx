"use client";

import { AriaMark } from "@/components/aria-mark";
import { AriaOpenUIComposer } from "@/components/chat/aria-openui-composer";
import { pickChatGreeting } from "@/lib/aria-chat-greeting";
import { useThreadList } from "@openuidev/react-headless";
import { useMemo } from "react";

export type AriaOpenUIWelcomeProps = {
  userName: string;
};

export function AriaOpenUIWelcome({ userName }: AriaOpenUIWelcomeProps) {
  const selectedThreadId = useThreadList((s) => s.selectedThreadId);

  const greetingSeed = selectedThreadId ?? "new";
  const greeting = useMemo(
    () => pickChatGreeting(userName, greetingSeed),
    [greetingSeed, userName],
  );

  return (
    <div className="openui-agent-welcome-screen openui-agent-welcome-screen--with-composer aria-openui-welcome">
      <header className="aria-openui-welcome__hero">
        <span className="aria-openui-welcome__logo" aria-hidden>
          <AriaMark className="aria-openui-welcome__mark" />
        </span>
        <h1 className="aria-openui-welcome__title">{greeting}</h1>
      </header>

      <div className="openui-agent-welcome-screen__composer-starters-container aria-openui-welcome__composer-wrap">
        <div className="openui-agent-welcome-screen__desktop-composer">
          <AriaOpenUIComposer
            variant="welcome"
            placeholder="How can I help you today?"
          />
        </div>
      </div>
    </div>
  );
}
