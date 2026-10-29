"use client";

import { AriaMark } from "@/components/aria-mark";
import { AriaOpenUIComposer } from "@/components/chat/aria-openui-composer";
import { pickChatGreeting } from "@/lib/aria-chat-greeting";
import { useThreadList } from "@openuidev/react-headless";
import { useEffect, useMemo, useState } from "react";

export type AriaOpenUIWelcomeProps = {
  userName: string;
};

export function AriaOpenUIWelcome({ userName }: AriaOpenUIWelcomeProps) {
  const selectedThreadId = useThreadList((s) => s.selectedThreadId);
  const [shown, setShown] = useState(false);

  const greetingSeed = selectedThreadId ?? "new";
  const greeting = useMemo(
    () => pickChatGreeting(userName, greetingSeed),
    [greetingSeed, userName],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="openui-agent-welcome-screen openui-agent-welcome-screen--with-composer aria-openui-welcome">
      <div className={`t-stagger${shown ? " is-shown" : ""}`}>
        <header className="aria-openui-welcome__hero t-stagger-line">
          <span className="aria-openui-welcome__logo" aria-hidden>
            <AriaMark className="aria-openui-welcome__mark" />
          </span>
          <h1 className="aria-openui-welcome__title">{greeting}</h1>
        </header>
        <p className="aria-openui-welcome__lede t-stagger-line t-stagger-line--2">
          Think once. Know more.
        </p>
      </div>

      <div className="openui-agent-welcome-screen__composer-starters-container aria-openui-welcome__composer-wrap">
        <div className="openui-agent-welcome-screen__desktop-composer">
          <AriaOpenUIComposer
            variant="welcome"
            placeholder="Describe your question or task"
          />
        </div>
      </div>
    </div>
  );
}
