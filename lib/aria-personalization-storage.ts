const STORAGE_KEY = "aria-personalization";

export type AriaPersonalizationSnapshot = {
  customInstructions: string;
  personality: "default" | "friendly" | "professional" | "concise";
  memoryEnabled: boolean;
  referenceChatHistory: boolean;
};

const DEFAULTS: AriaPersonalizationSnapshot = {
  customInstructions: "",
  personality: "default",
  memoryEnabled: true,
  referenceChatHistory: true,
};

export function loadAriaPersonalization(): AriaPersonalizationSnapshot {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AriaPersonalizationSnapshot>;
    return {
      customInstructions:
        typeof parsed.customInstructions === "string"
          ? parsed.customInstructions
          : DEFAULTS.customInstructions,
      personality:
        parsed.personality === "friendly" ||
        parsed.personality === "professional" ||
        parsed.personality === "concise"
          ? parsed.personality
          : DEFAULTS.personality,
      memoryEnabled:
        typeof parsed.memoryEnabled === "boolean"
          ? parsed.memoryEnabled
          : DEFAULTS.memoryEnabled,
      referenceChatHistory:
        typeof parsed.referenceChatHistory === "boolean"
          ? parsed.referenceChatHistory
          : DEFAULTS.referenceChatHistory,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAriaPersonalization(next: AriaPersonalizationSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
