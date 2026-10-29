"use client";

import { AriaWorkspaceOverlay } from "@/components/workspace/aria-workspace-overlay";
import { cn } from "@/lib/utils";
import { useNav } from "@openuidev/react-ui";
import {
  CreditCard,
  Keyboard,
  LifeBuoy,
  LibraryBig,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type HelpSection = {
  heading: string;
  body: string;
};

type HelpShortcut = {
  keys: string[];
  label: string;
};

type HelpTopic = {
  id: string;
  label: string;
  summary: string;
  icon: typeof LifeBuoy;
  sections: HelpSection[];
  shortcuts?: HelpShortcut[];
};

const TOPICS: HelpTopic[] = [
  {
    id: "getting-started",
    label: "Getting started",
    summary: "Start a chat and send a message.",
    icon: Sparkles,
    sections: [
      {
        heading: "New chat",
        body: "Choose New chat in the sidebar. The welcome screen asks how it can help, and the composer sits underneath.",
      },
      {
        heading: "Send a message",
        body: "Type in the composer and press Enter, or use the arrow button. Shift + Enter adds a new line without sending.",
      },
      {
        heading: "This preview",
        body: "Replies stream in the workspace. Live model calls and checkout are not turned on yet.",
      },
    ],
  },
  {
    id: "credits",
    label: "Credits and billing",
    summary: "See what plan you are on and what is left.",
    icon: CreditCard,
    sections: [
      {
        heading: "Where usage shows",
        body: "The sidebar lists credits used this month. Settings → Billing shows the same balance: how many are used and how many are left.",
      },
      {
        heading: "What billing includes",
        body: "Billing is only your current plan and this month’s credit use. It does not list other plans.",
      },
    ],
  },
  {
    id: "plans",
    label: "Upgrade plan",
    summary: "Free, Pro, and Max (Team).",
    icon: Sparkles,
    sections: [
      {
        heading: "The three plans",
        body: "Upgrade plan, in the account menu, compares Free, Pro, and Max. Max is the Team workspace plan, with a shared credit pool and seats.",
      },
      {
        heading: "Your current plan",
        body: "The plan you are on is marked. Choosing another plan does not check out in this preview.",
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    summary: "Library and recent chats.",
    icon: LibraryBig,
    sections: [
      {
        heading: "Library",
        body: "Library collects files, links, and chats you keep. Search and switch between suggested, favorites, and the full list.",
      },
      {
        heading: "Recents",
        body: "Recents is the list of chats in this browser. Nothing is stored on a server in this preview.",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    summary: "Account, privacy, billing, and data.",
    icon: Settings,
    sections: [
      {
        heading: "Open settings",
        body: "Use Settings in the account menu. Search at the top of the dialog jumps between sections.",
      },
      {
        heading: "Sections",
        body: "Account holds your profile. Privacy and Data controls cover sharing and export. Billing is separate from Upgrade plan. Team appears when you are on Max.",
      },
    ],
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    summary: "Send, break a line, and close dialogs.",
    icon: Keyboard,
    sections: [
      {
        heading: "Composer and dialogs",
        body: "These shortcuts work in the workspace preview.",
      },
    ],
    shortcuts: [
      { keys: ["Enter"], label: "Send the message" },
      { keys: ["Shift", "Enter"], label: "New line in the composer" },
      { keys: ["Esc"], label: "Close settings, menus, and dialogs" },
    ],
  },
];

function topicMatches(topic: HelpTopic, query: string) {
  if (!query) return true;
  const haystack = [
    topic.label,
    topic.summary,
    ...topic.sections.flatMap((section) => [section.heading, section.body]),
    ...(topic.shortcuts?.flatMap((shortcut) => [shortcut.label, ...shortcut.keys]) ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function AriaHelpView() {
  const { navigate } = useNav();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(TOPICS[0].id);
  const normalized = query.trim().toLowerCase();
  const close = useCallback(() => navigate(undefined), [navigate]);

  const visible = useMemo(
    () => TOPICS.filter((topic) => topicMatches(topic, normalized)),
    [normalized],
  );

  const active = visible.find((topic) => topic.id === activeId) ?? visible[0];

  return (
    <AriaWorkspaceOverlay label="Help" onClose={close} className="aria-overlay-dialog">
        <div className="aria-help">
        <header className="aria-help__header">
          <div className="aria-help__intro">
            <LifeBuoy className="aria-help__mark" size={22} strokeWidth={1.75} aria-hidden />
            <div>
              <h1 className="aria-help__title">Help</h1>
              <p className="aria-help__lede">Guides for chat, credits, plans, and the workspace.</p>
            </div>
          </div>
          <label className="aria-help__search">
            <Search className="aria-help__search-icon" size={16} strokeWidth={1.75} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search help"
              aria-label="Search help"
            />
          </label>
        </header>

        {visible.length === 0 || !active ? (
          <p className="aria-help__empty">No topics match that search.</p>
        ) : (
          <div className="aria-help__body">
            <nav className="aria-help__nav" aria-label="Help topics">
              {visible.map((topic) => {
                const Icon = topic.icon;
                const selected = topic.id === active.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    className={cn("aria-help__topic", selected && "aria-help__topic--active")}
                    aria-current={selected ? "page" : undefined}
                    onClick={() => setActiveId(topic.id)}
                  >
                    <Icon size={16} strokeWidth={1.75} aria-hidden />
                    <span>
                      <span className="aria-help__topic-label">{topic.label}</span>
                      <span className="aria-help__topic-summary">{topic.summary}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

            <article className="aria-help__article" aria-labelledby="aria-help-article-title">
              <h2 id="aria-help-article-title">{active.label}</h2>
              <p className="aria-help__article-summary">{active.summary}</p>
              {active.sections.map((section) => (
                <section key={section.heading}>
                  <h3>{section.heading}</h3>
                  <p>{section.body}</p>
                </section>
              ))}
              {active.shortcuts ? (
                <ul className="aria-help__shortcuts">
                  {active.shortcuts.map((shortcut) => (
                    <li key={shortcut.label}>
                      <span>{shortcut.label}</span>
                      <span className="aria-help__keys">
                        {shortcut.keys.map((key) => (
                          <kbd key={key}>{key}</kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </div>
        )}
        </div>
    </AriaWorkspaceOverlay>
  );
}
