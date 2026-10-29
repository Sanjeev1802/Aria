"use client";

import { Suspense } from "react";
import { AriaHideDevChrome } from "@/components/dev/aria-hide-dev-chrome";
import { AriaOpenUIChat } from "@/components/chat/aria-openui-chat";
import { ThinkingStatus } from "@/components/chat/thinking-status";

function WorkspaceFallback() {
  return (
    <div className="chat-page flex min-h-dvh items-center justify-center bg-background">
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
    <div className="chat-page min-h-dvh w-full">
      <AriaHideDevChrome />
      <Suspense fallback={<WorkspaceFallback />}>
        <AriaOpenUIChat initialPath={initialPath} />
      </Suspense>
    </div>
  );
}
