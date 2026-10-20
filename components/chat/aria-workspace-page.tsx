"use client";

import { Suspense } from "react";
import { AriaOpenUIChat } from "@/components/chat/aria-openui-chat";
import { ThinkingStatus } from "@/components/chat/thinking-status";

function WorkspaceFallback() {
  return (
    <div className="chat-page dark flex min-h-dvh items-center justify-center bg-background">
      <ThinkingStatus />
    </div>
  );
}

export type AriaWorkspacePageProps = {
  initialPath?: string;
};

/** Full chat shell (sidebar + workspace route) for /chat/, /profile/, /pricing/, etc. */
export function AriaWorkspacePage({ initialPath }: AriaWorkspacePageProps) {
  return (
    <div className="chat-page dark min-h-dvh w-full">
      <Suspense fallback={<WorkspaceFallback />}>
        <AriaOpenUIChat initialPath={initialPath} />
      </Suspense>
    </div>
  );
}
