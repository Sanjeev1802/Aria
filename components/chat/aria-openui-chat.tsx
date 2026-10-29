"use client";

import "@/lib/disable-openui-inspect";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { AriaSettingsModal } from "@/components/account/aria-settings-modal";
import { AriaLibraryView } from "@/components/library/aria-library-view";
import { AriaHelpView } from "@/components/workspace/aria-help-view";
import { AriaPricingView } from "@/components/workspace/aria-pricing-view";
import type { AriaWorkspacePath } from "@/lib/aria-workspace-paths";
import { useRouter } from "next/navigation";
import { ARIA_IS_PREVIEW, refreshAriaSession, useAriaProfile, useAriaSession } from "@/lib/aria-session";
import { signInHref } from "@/lib/auth/safe-next-path";
import { AriaAuthNotice } from "@/components/auth/aria-auth-notice";
import { ThinkingStatus } from "@/components/chat/thinking-status";
import { AriaMark } from "@/components/aria-mark";
import { AgentInterface, openuiChatLibrary } from "@openuidev/react-ui";
import { AriaOpenUIAssistantMessage } from "@/components/chat/aria-openui-assistant-message";
import { AriaOpenUIComposer } from "@/components/chat/aria-openui-composer";
import { AriaOpenUIWelcome } from "@/components/chat/aria-openui-welcome";
import { AriaOpenUISidebarCollapsedLogo } from "@/components/chat/aria-openui-sidebar-collapsed-logo";
import { AriaOpenUIRecentsList } from "@/components/chat/aria-openui-recents-list";
import { AriaOpenUISidebarNav } from "@/components/chat/aria-openui-sidebar-nav";
import { AriaOpenUISidebarResponsive } from "@/components/chat/aria-openui-sidebar-responsive";
import { AriaOpenUISidebarCredits } from "@/components/chat/aria-openui-sidebar-credits";
import { AriaOpenUISidebarUser } from "@/components/chat/aria-openui-sidebar-user";
import { AriaThemeIconToggle } from "@/components/chat/aria-theme-icon-toggle";
import { ariaOpenUIDarkTheme, ariaOpenUILightTheme } from "@/lib/aria-openui-theme";
import { readAriaTheme, subscribeAriaTheme } from "@/lib/aria-theme";
import { getAriaChatLLM } from "@/lib/aria-openui-llm";
import { useThreadList } from "@openuidev/react-headless";
import { createAriaThreadStorage } from "@/lib/aria-thread-storage";
import { AriaProjectProvider, useAriaProjects } from "@/lib/aria-project-context";
import { watchAndRemoveOpenUIDevtools } from "@/lib/remove-openui-devtools-dom";

const SESSION_SYNC_MS = 15_000;

function AriaWorkspaceBrand({
  className,
  children,
  onNavigate,
}: {
  className: string;
  children: ReactNode;
  onNavigate: (path: string | undefined) => void;
}) {
  const switchToNewThread = useThreadList((s) => s.switchToNewThread);
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      aria-label="New chat"
      title="New chat"
      onClick={() => {
        switchToNewThread();
        onNavigate(undefined);
        const path = window.location.pathname;
        if (path !== "/chat/" && path !== "/chat") router.push("/chat/");
      }}
    >
      {children}
    </button>
  );
}

export type AriaOpenUIChatProps = {
  /** Opens a workspace route on load (e.g. `pricing` from `/pricing/`). */
  initialPath?: string;
};

export function AriaOpenUIChat(props: AriaOpenUIChatProps = {}) {
  const session = useAriaSession();
  return <AriaProjectProvider key={session.workspace?.id ?? session.status}>
    <AriaOpenUIChatContent {...props} />
  </AriaProjectProvider>;
}

function AriaOpenUIChatContent({ initialPath }: AriaOpenUIChatProps) {
  const themeMode = useSyncExternalStore(subscribeAriaTheme, readAriaTheme, () => "dark" as const);
  const llm = useMemo(() => getAriaChatLLM(), []);
  const { getActiveProjectId } = useAriaProjects();
  const threadStorage = useMemo(() => createAriaThreadStorage(getActiveProjectId), [getActiveProjectId]);
  const router = useRouter();
  const profile = useAriaProfile();
  const sessionStatus = profile.session.status;
  const aiAccessSuspended = Boolean(profile.session.user?.aiAccessSuspended);
  const [navPath, setNavPath] = useState<string | undefined>(() => initialPath);
  const chatBlocked = aiAccessSuspended && navPath === undefined;
  const [seenInitialPath, setSeenInitialPath] = useState(initialPath);
  if (initialPath !== seenInitialPath) {
    setSeenInitialPath(initialPath);
    if (initialPath !== undefined) setNavPath(initialPath);
  }

  const onNavigate = useCallback((next: string | undefined) => {
    setNavPath(next);
  }, []);

  useEffect(() => watchAndRemoveOpenUIDevtools(), []);

  useEffect(() => { void refreshAriaSession(); }, []);

  // Live sync: plan, credit and AI-access changes made in the internal dashboard reach an open
  // workspace within seconds, and again as soon as the tab regains focus.
  useEffect(() => {
    if (ARIA_IS_PREVIEW) return;
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      void refreshAriaSession({ force: true });
      window.dispatchEvent(new Event("aria:credits-updated"));
    };
    const id = window.setInterval(sync, SESSION_SYNC_MS);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (sessionStatus !== "unauthenticated") return;
    const next = window.location.pathname + window.location.search;
    router.replace(signInHref(next));
  }, [router, sessionStatus]);

  const banner = process.env.NEXT_PUBLIC_ARIA_PREVIEW === "true"
    ? "Design preview · scripted replies · no charges"
    : profile.session.localDev
      ? "Local demo · deterministic test model · server ledger"
      : sessionStatus === "unavailable"
        ? "Live AI is not configured on this server"
        : profile.session.liveChat === false ? "Chat is not enabled yet" : null;

  if (sessionStatus === "loading" || sessionStatus === "unauthenticated") {
    return (
      <div className={`aria-openui-chat flex h-dvh w-full items-center justify-center bg-background${themeMode === "dark" ? " dark" : ""}`}>
        <AriaAuthNotice />
        <ThinkingStatus />
      </div>
    );
  }

  return (
    <div className={`aria-openui-chat h-dvh w-full${themeMode === "dark" ? " dark" : ""}`}>
      <AriaAuthNotice />
      {banner ? (
        <div role="status" className="pointer-events-none fixed right-3 top-16 z-50 max-w-[calc(100%-1.5rem)] rounded-md bg-neutral-900 px-3 py-1 text-xs text-neutral-400 sm:top-2">
          {banner}
        </div>
      ) : null}
      <AgentInterface
        key={profile.session.workspace?.id ?? sessionStatus}
        llm={llm}
        storage={process.env.NEXT_PUBLIC_ARIA_PREVIEW === "true" ? undefined : threadStorage}
        componentLibrary={openuiChatLibrary}
        components={{ AssistantMessage: AriaOpenUIAssistantMessage }}
        agentName="ARIA"
        theme={{
          mode: themeMode,
          darkTheme: ariaOpenUIDarkTheme,
          lightTheme: ariaOpenUILightTheme,
        }}
        scrollVariant="user-message-anchor"
        path={navPath}
        defaultPath={initialPath}
        onNavigate={onNavigate}
      >
        <AriaOpenUISidebarResponsive />
        <AgentInterface.MobileHeader
          logo={
            <AriaWorkspaceBrand className="aria-openui-mobile-header-brand" onNavigate={onNavigate}>
              <AriaMark className="aria-openui-sidebar-mark" />
            </AriaWorkspaceBrand>
          }
          agentName={<span className="aria-openui-mobile-header-title">ARIA</span>}
          actions={
            <div className="aria-openui-header-actions">
              <AriaThemeIconToggle />
              <AriaOpenUISidebarUser
                placement="header"
                name={profile.name}
                email={profile.email}
                avatar={profile.avatar}
                activeWorkspacePath={navPath}
                onWorkspaceNavigate={(path: AriaWorkspacePath) => onNavigate(path)}
              />
            </div>
          }
        />
        <AgentInterface.Sidebar>
          <div className="aria-openui-sidebar-shell">
          <div className="openui-agent-sidebar-actions aria-openui-sidebar-top">
            <AgentInterface.SidebarHeader
              logo={<AriaOpenUISidebarCollapsedLogo />}
              agentName={
                <AriaWorkspaceBrand className="aria-openui-sidebar-brand" onNavigate={onNavigate}>
                  <AriaMark className="aria-openui-sidebar-mark" aria-hidden />
                  <span className="aria-openui-sidebar-brand__name">ARIA</span>
                </AriaWorkspaceBrand>
              }
            />
          </div>
          <AgentInterface.SidebarContent>
            <AriaOpenUISidebarNav activePath={navPath} onNavigate={onNavigate} />
            <div className="aria-openui-sidebar-main">
              <section
                className="aria-openui-sidebar-section aria-openui-recents"
                aria-labelledby="aria-openui-recents-heading"
              >
                <h2
                  id="aria-openui-recents-heading"
                  className="aria-openui-sidebar-section-label aria-openui-recents__heading"
                >
                  Recents
                </h2>
                <AriaOpenUIRecentsList />
              </section>
            </div>
          </AgentInterface.SidebarContent>
          <AgentInterface.SidebarFooter>
            <div className="aria-openui-sidebar-footer-stack">
              <AriaOpenUISidebarCredits />
            </div>
          </AgentInterface.SidebarFooter>
          </div>
        </AgentInterface.Sidebar>
        {/* AgentInterface finds its slots among its direct children (a Fragment would hide them), and
            renders anything else as a stray column, so the access gate lives inside the slots. */}
        <AgentInterface.Welcome glowAnimation={false}>
          {chatBlocked ? (
            <div className="aria-ai-access-gate" role="status">
              <h2 className="aria-ai-access-gate__title">ARIA AI is not available</h2>
              <p className="aria-ai-access-gate__lede">
                You can still sign in and manage your account. Choose a subscription plan to use chat and intelligence features.
              </p>
              <button type="button" className="aria-ai-access-gate__cta" onClick={() => onNavigate("pricing")}>
                View subscription plans
              </button>
            </div>
          ) : (
            <AriaOpenUIWelcome userName={profile.name} />
          )}
        </AgentInterface.Welcome>
        <AgentInterface.Composer>
          {aiAccessSuspended ? (
            <div className="aria-ai-access-gate__bar" role="status">
              <span>ARIA AI is not available on this account.</span>
              <button type="button" className="aria-ai-access-gate__link" onClick={() => onNavigate("pricing")}>
                View subscription plans
              </button>
            </div>
          ) : (
            <AriaOpenUIComposer variant="thread" />
          )}
        </AgentInterface.Composer>
        <AgentInterface.ThreadHeader
          showChatTitle={false}
          showChatActions={false}
          end={
            <div className="aria-openui-header-actions">
              <AriaThemeIconToggle />
              <AriaOpenUISidebarUser
                placement="header"
                name={profile.name}
                email={profile.email}
                avatar={profile.avatar}
                activeWorkspacePath={navPath}
                onWorkspaceNavigate={(path: AriaWorkspacePath) => onNavigate(path)}
              />
            </div>
          }
        />
        <AgentInterface.Workspace>{false}</AgentInterface.Workspace>
        <AgentInterface.Route path="library">
          <AriaLibraryView />
        </AgentInterface.Route>
        <AgentInterface.Route path="pricing">
          <AriaPricingView />
        </AgentInterface.Route>
        <AgentInterface.Route path="settings">
          <AriaSettingsModal preferredSection="account" />
        </AgentInterface.Route>
        <AgentInterface.Route path="help">
          <AriaHelpView />
        </AgentInterface.Route>
      </AgentInterface>
    </div>
  );
}
