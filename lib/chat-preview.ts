export type ChatMode = "general" | "intelligence";

export type EvidenceSource = {
  id: string;
  title: string;
  kind: "document" | "dataset" | "aggregate";
  scope: string;
  period: string;
  freshness: string;
  detail: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type Conversation = {
  id: string;
  title: string;
  mode: ChatMode;
  model: string;
  messages: ChatMessage[];
  sources: EvidenceSource[];
  updatedAt: number;
};

export const PREVIEW_CREDITS = { used: 42, included: 200, label: "Free preview" };

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function titleFromPrompt(prompt: string) {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New conversation";
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
}

const intelligenceSources: EvidenceSource[] = [
  {
    id: "src-market-pulse",
    title: "ARIA Market Pulse (aggregated)",
    kind: "aggregate",
    scope: "Authorized telco & wallet segments · Southeast Asia",
    period: "Rolling 90 days vs prior 90 days",
    freshness: "Refreshed daily · last sync 6h ago",
    detail: "Engagement index and active-user trends. Cells below k=50 are suppressed.",
  },
  {
    id: "src-doc",
    title: "Market overview.pdf",
    kind: "document",
    scope: "Uploaded workspace file · 24 pages",
    period: "Q3 planning narrative",
    freshness: "Processed in preview · not uploaded to a server",
    detail: "Sections 4–7 cited for growth assumptions and channel mix.",
  },
];

/** Heuristic for preview replies that attach intelligence sources. */
export function inferPreviewChatMode(prompt: string): ChatMode {
  const lower = prompt.toLowerCase();
  if (
    lower.includes("market") ||
    lower.includes("metric") ||
    lower.includes("document") ||
    lower.includes("intelligence") ||
    lower.includes("dataset") ||
    lower.includes("segment") ||
    lower.includes("source")
  ) {
    return "intelligence";
  }
  return "general";
}

export function previewAssistantReply(prompt: string, mode: ChatMode): { text: string; sources: EvidenceSource[] } {
  const lower = prompt.toLowerCase();

  if (mode === "general") {
    if (/^(hi|hello|hey)\b/.test(lower)) {
      return {
        text: "Hello! How can I help you today?",
        sources: [],
      };
    }
    if (lower.includes("plan") || lower.includes("idea")) {
      return {
        text: "Here is a concise plan you can refine:\n\n1. **Frame the decision** — What outcome matters in the next 30 days?\n2. **List constraints** — Budget, timeline, and stakeholders.\n3. **Draft options** — Two or three paths with trade-offs.\n4. **Define the next step** — One owner, one date, one measurable check-in.",
        sources: [],
      };
    }
    if (lower.includes("grid") || lower.includes("css")) {
      return {
        text: 'Creating a responsive layout with CSS Grid is straightforward. Here is a basic example:\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 1rem;\n}\n```\n\nThis creates a grid where columns automatically fit as many as possible, each at least 250px wide, with a 1rem gap between items.\n\nWould you like me to explain more about how this works?',
        sources: [],
      };
    }
    const trimmed = prompt.trim();
    return {
      text: `Here is a preview response to **“${trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed}”**.\n\nI would walk through the idea step by step, ask clarifying questions if needed, and suggest concrete next actions. Connect a live model to replace this simulated reply.`,
      sources: [],
    };
  }

  if (lower.includes("market") || lower.includes("explore")) {
    return {
      text: "**Summary (illustrative)**\n\nAuthorized aggregate signals suggest **engagement is up ~8–12%** in two segments you are permitted to view, while a third segment is **flat**. Wallet-linked activity contributes most of the lift.\n\n**What we used**\n- ARIA Market Pulse (aggregated, k≥50 enforced)\n- Your uploaded market overview (sections 4–7)\n\n**Limitations**\n- Preview data only — not live ARIA.\n- Segments with fewer than 50 contributing users are withheld.\n- Correlation is not causation; seasonality may explain part of the lift.\n\n**Suggested next step:** Compare the top two segments by channel for the same period, then export a decision brief for your team.",
      sources: intelligenceSources,
    };
  }

  return {
    text: "**Summary (preview)**\n\nAuthorized aggregate signals suggest **engagement is up ~8–12%** in two segments you are permitted to view, while a third segment is **flat**.\n\n**Limitations:** Preview data only — not live ARIA. Segments with fewer than 50 contributing users are withheld.",
    sources: intelligenceSources.slice(0, 1),
  };
}

export function buildDecisionBriefMarkdown(
  conversationTitle: string,
  mode: ChatMode,
  userQuestion: string,
  assistantAnswer: string,
  sources: EvidenceSource[],
) {
  const lines = [
    `# Decision brief — ${conversationTitle}`,
    "",
    `**Mode:** ${mode === "intelligence" ? "ARIA Intelligence" : "General"}`,
    `**Generated:** ${new Date().toISOString().slice(0, 10)} (preview)`,
    "",
    "## Question",
    userQuestion,
    "",
    "## Main findings",
    assistantAnswer.replace(/\*\*/g, ""),
    "",
    "## Data scope",
    mode === "intelligence"
      ? sources.map((s) => `- ${s.title}: ${s.scope} (${s.period})`).join("\n") || "- No sources attached in this preview."
      : "- General mode — conversation and attachments only.",
    "",
    "## Limitations",
    "- Interactive product preview; not validated production data.",
    mode === "intelligence" ? "- Aggregate cells below k=50 are suppressed." : "- No business datasets queried in General mode.",
    "",
    "## Recommended next steps",
    "1. Validate findings with an owner of the underlying data.",
    "2. Capture dissenting assumptions in one paragraph.",
    "3. Schedule a review date.",
    "",
    "_Linked conversation: preview only (not persisted to a server)._",
  ];
  return lines.join("\n");
}

const STORAGE_KEY = "aria-chat-preview-v1";

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 30)));
}
