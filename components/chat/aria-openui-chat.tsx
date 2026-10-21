"use client";

import "@/lib/disable-openui-inspect";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AriaSettingsModal } from "@/components/account/aria-settings-modal";
import { AriaLibraryView } from "@/components/library/aria-library-view";
import { AriaHelpView } from "@/components/workspace/aria-help-view";
import { AriaPricingView } from "@/components/workspace/aria-pricing-view";
import type { AriaWorkspacePath } from "@/lib/aria-workspace-paths";
import { useRouter } from "next/navigation";
import { refreshAriaSession, useAriaProfile, useAriaSession } from "@/lib/aria-session";
import { AriaAuthNotice } from "@/components/auth/aria-auth-notice";
import { AriaLocalUserSwitcher } from "@/components/dev/aria-local-user-switcher";
import { AriaLocalPlanSwitcher } from "@/components/dev/aria-local-plan-switcher";
import { AriaMark } from "@/components/aria-mark";
import { AgentInterface, openuiChatLibrary } from "@openuidev/react-ui";
import { AriaOpenUIAssistantMessage } from "@/components/chat/aria-openui-assistant-message";
import { AriaOpenUIComposer } from "@/components/chat/aria-openui-composer";
import { AriaOpenUIWelcome } from "@/components/chat/aria-openui-welcome";
import { AriaOpenUISidebarCollapsedLogo } from "@/components/chat/aria-openui-sidebar-collapsed-logo";
import { AriaOpenUIRecentsList } from "@/components/chat/aria-openui-recents-list";
import { AriaOpenUISidebarNav } from "@/components/chat/aria-openui-sidebar-nav";
import { AriaOpenUISidebarProjects } from "@/components/chat/aria-openui-sidebar-projects";
import { AriaOpenUISidebarResponsive } from "@/components/chat/aria-openui-sidebar-responsive";
import { AriaOpenUISidebarCredits } from "@/components/chat/aria-openui-sidebar-credits";
import { AriaOpenUISidebarUser } from "@/components/chat/aria-openui-sidebar-user";
import { ariaOpenUIDarkTheme } from "@/lib/aria-openui-theme";
import { getAriaChatLLM } from "@/lib/aria-openui-llm";
import { createAriaThreadStorage } from "@/lib/aria-thread-storage";
import { AriaProjectProvider, useAriaProjects } from "@/lib/aria-project-context";
import { watchAndRemoveOpenUIDevtools } from "@/lib/remove-openui-devtools-dom";

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
  const llm = useMemo(() => getAriaChatLLM(), []);
  const { activeProjectRef } = useAriaProjects();
  const threadStorage = useMemo(() => createAriaThreadStorage(() => activeProjectRef.current), [activeProjectRef]);
  const router = useRouter();
  const profile = useAriaProfile();
  const sessionStatus = profile.session.status;
  const [navPath, setNavPath] = useState<string | undefined>(() => initialPath);

  const onNavigate = useCallback((next: string | undefined) => {
    setNavPath(next);
  }, []);

  useEffect(() => {
    if (initialPath !== undefined) {
      setNavPath(initialPath);
    }
  }, [initialPath]);

  useEffect(() => watchAndRemoveOpenUIDevtools(), []);

  useEffect(() => { void refreshAriaSession(); }, []);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.replace("/sign-in/?next=/chat/");
  }, [router, sessionStatus]);

  const banner = process.env.NEXT_PUBLIC_ARIA_PREVIEW === "true"
    ? "Design preview · scripted replies · no charges"
    : profile.session.localDev
      ? "Local demo · deterministic test model · server ledger"
      : sessionStatus === "unavailable"
        ? "Live AI is not configured on this server"
        : profile.session.liveChat === false ? "Chat is not enabled yet" : null;

  return (
    <div className="aria-openui-chat dark h-dvh w-full">
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
        theme={{ mode: "dark", darkTheme: ariaOpenUIDarkTheme }}
        scrollVariant="user-message-anchor"
        path={navPath}
        defaultPath={initialPath}
        onNavigate={onNavigate}
      >
        <AriaOpenUISidebarResponsive />
        <AgentInterface.MobileHeader
          logo={
            <Link href="/" className="aria-openui-mobile-header-brand" aria-label="ARIA home">
              <AriaMark className="aria-openui-sidebar-mark" />
            </Link>
          }
          agentName={<span className="aria-openui-mobile-header-title">ARIA</span>}
        />
        <AgentInterface.Sidebar>
          <div className="aria-openui-sidebar-shell">
          <div className="openui-agent-sidebar-actions aria-openui-sidebar-top">
            <AgentInterface.SidebarHeader
              logo={<AriaOpenUISidebarCollapsedLogo />}
              agentName={
                <Link href="/" className="aria-openui-sidebar-brand" title="ARIA home">
                  <AriaMark className="aria-openui-sidebar-mark" aria-hidden />
                  <span className="aria-openui-sidebar-brand__name">ARIA</span>
                </Link>
              }
            />
          </div>
          <AgentInterface.SidebarContent>
            <AriaOpenUISidebarNav activePath={navPath} onNavigate={onNavigate} />
            <div className="aria-openui-sidebar-main">
              <AriaOpenUISidebarProjects />
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
              <AriaLocalUserSwitcher />
              <AriaLocalPlanSwitcher />
              <AriaOpenUISidebarCredits />
              <AriaOpenUISidebarUser
                name={profile.name}
                email={profile.planShort}
                avatar={profile.avatar}
                activeWorkspacePath={navPath}
                onWorkspaceNavigate={(path: AriaWorkspacePath) => onNavigate(path)}
              />
            </div>
          </AgentInterface.SidebarFooter>
          </div>
        </AgentInterface.Sidebar>
        <AgentInterface.Welcome glowAnimation={false}>
          <AriaOpenUIWelcome userName={profile.name} />
        </AgentInterface.Welcome>
        <AgentInterface.Composer>
          <AriaOpenUIComposer variant="thread" />
        </AgentInterface.Composer>
        <AgentInterface.ThreadHeader
          showChatTitle={false}
          showChatActions={false}
          end={null}
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
