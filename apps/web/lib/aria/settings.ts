export type SettingsData = {
  theme: "system" | "light" | "dark";
  language: string;
  enterToSend: boolean;
  showTips: boolean;
  emailNotifications: boolean;
  productUpdates: boolean;
  baseTone: "default" | "professional" | "friendly" | "direct";
  warm: boolean;
  enthusiastic: boolean;
  headersAndLists: boolean;
  emoji: boolean;
  fastAnswers: boolean;
  customInstructions: string;
  trainOnChats: boolean;
};

const SETTINGS_KEY = "aria.workspace.settings.v1";

export const defaultSettings = (): SettingsData => ({
  theme: "system",
  language: "English",
  enterToSend: true,
  showTips: true,
  emailNotifications: true,
  productUpdates: false,
  baseTone: "default",
  warm: false,
  enthusiastic: false,
  headersAndLists: true,
  emoji: false,
  fastAnswers: true,
  customInstructions: "",
  trainOnChats: false,
});

export function loadSettings(): SettingsData {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...(JSON.parse(raw) as Partial<SettingsData>) };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: SettingsData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
