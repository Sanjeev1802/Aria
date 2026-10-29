/** ARIA attention levels — product names for Claude effort low / medium / high. */
export const ARIA_ATTENTION_IDS = ["glance", "think", "know"] as const;
export type AriaAttentionId = (typeof ARIA_ATTENTION_IDS)[number];
export type ClaudeEffort = "low" | "medium" | "high";

export type AriaAttentionLevel = {
  id: AriaAttentionId;
  label: string;
  claude: ClaudeEffort;
  hint: string;
};

export const ARIA_ATTENTION: Record<AriaAttentionId, AriaAttentionLevel> = {
  glance: {
    id: "glance",
    label: "Glance",
    claude: "low",
    hint: "Faster, lighter answers",
  },
  think: {
    id: "think",
    label: "Think",
    claude: "medium",
    hint: "Balanced depth",
  },
  know: {
    id: "know",
    label: "Know",
    claude: "high",
    hint: "More thorough answers",
  },
};

export const ARIA_ATTENTION_LEVELS: AriaAttentionLevel[] = [
  ARIA_ATTENTION.glance,
  ARIA_ATTENTION.think,
  ARIA_ATTENTION.know,
];

export const DEFAULT_ARIA_ATTENTION: AriaAttentionId = "glance";

export const ARIA_ATTENTION_HINT =
  "Higher attention means more thorough answers, but takes longer and uses your limits faster.";

const STORAGE_KEY = "aria-attention";

let current: AriaAttentionId = DEFAULT_ARIA_ATTENTION;

export function parseAriaAttention(value: unknown): AriaAttentionId {
  if (value === "glance" || value === "think" || value === "know") return value;
  return DEFAULT_ARIA_ATTENTION;
}

export function claudeEffortFor(id: AriaAttentionId): ClaudeEffort {
  return ARIA_ATTENTION[id].claude;
}

export function getAriaAttention(): AriaAttentionId {
  return current;
}

export function setAriaAttention(id: AriaAttentionId) {
  current = id;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode */
  }
}

export function loadAriaAttention(): AriaAttentionId {
  if (typeof window === "undefined") return current;
  try {
    current = parseAriaAttention(localStorage.getItem(STORAGE_KEY));
  } catch {
    current = DEFAULT_ARIA_ATTENTION;
  }
  return current;
}
