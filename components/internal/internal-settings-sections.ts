import type { LucideIcon } from "lucide-react";
import { Palette, Shield, SlidersHorizontal, Sparkles, Users } from "lucide-react";

/** Operator console preferences (non–super-admin). */
export type OperatorSettingsSectionId = "general" | "appearance" | "security" | "users";

/** Super-admin platform settings (no sidebar duplicates). */
export type PlatformSettingsSectionId = "general" | "appearance" | "tokens";

export type InternalSettingsSectionId = OperatorSettingsSectionId | PlatformSettingsSectionId;

const OPERATOR_SETTINGS_SECTION_IDS: OperatorSettingsSectionId[] = [
  "general",
  "appearance",
  "security",
  "users",
];

const PLATFORM_SETTINGS_SECTION_IDS: PlatformSettingsSectionId[] = ["general", "appearance", "tokens"];

/** Legacy deep links → current section. */
const LEGACY_PLATFORM_SETTINGS_ALIASES: Record<string, PlatformSettingsSectionId> = {
  members: "general",
  teams: "general",
  permissions: "general",
  billing: "general",
  audit: "general",
  models: "tokens",
  security: "general",
  notifications: "general",
  integrations: "general",
  data: "general",
  advanced: "general",
};

export type InternalSettingsNavItem = {
  id: InternalSettingsSectionId;
  label: string;
  icon: LucideIcon;
};

export const INTERNAL_SETTINGS_NAV: InternalSettingsNavItem[] = [
  { id: "general", label: "General", icon: SlidersHorizontal },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
  { id: "users", label: "Users & roles", icon: Users },
];

export const PLATFORM_SETTINGS_NAV: InternalSettingsNavItem[] = [
  { id: "general", label: "General", icon: SlidersHorizontal },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "tokens", label: "Token rules", icon: Sparkles },
];

export const INTERNAL_SETTINGS_SECTION_META: Record<
  InternalSettingsSectionId,
  { title: string; description: string }
> = {
  general: {
    title: "General",
    description: "Console context and regional display for operators.",
  },
  appearance: {
    title: "Appearance",
    description: "Light or dark mode for this internal console.",
  },
  security: {
    title: "Security",
    description: "Password and session behavior for your operator account.",
  },
  users: {
    title: "Users & roles",
    description: "Internal roles and permissions (assigned in server configuration).",
  },
  tokens: {
    title: "Token rules",
    description: "Monthly credit allowances, grant caps, and UTC billing period.",
  },
};

export const PLATFORM_SETTINGS_PAGE = {
  title: "Platform settings",
  description: "Console defaults and credit policy reference.",
};

export function resolveSettingsSectionMeta(
  section: InternalSettingsSectionId,
  isSuperAdmin: boolean,
): { title: string; description: string } {
  const meta = INTERNAL_SETTINGS_SECTION_META[section];
  if (isSuperAdmin && section === "general") {
    return {
      title: meta.title,
      description: "Platform information and regional settings for this console.",
    };
  }
  if (isSuperAdmin && section === "appearance") {
    return {
      title: meta.title,
      description: "Theme and layout for the internal console only — not the main ARIA app.",
    };
  }
  return meta;
}

export function buildInternalSettingsNav(isSuperAdmin: boolean): InternalSettingsNavItem[] {
  if (isSuperAdmin) return PLATFORM_SETTINGS_NAV;
  return INTERNAL_SETTINGS_NAV;
}

export function isPlatformSettingsSection(id: InternalSettingsSectionId): id is PlatformSettingsSectionId {
  return (PLATFORM_SETTINGS_SECTION_IDS as readonly string[]).includes(id);
}

export function parseInternalSettingsSection(
  value: string | null,
  isSuperAdmin: boolean,
): InternalSettingsSectionId | undefined {
  if (!value) return undefined;
  if (isSuperAdmin && value in LEGACY_PLATFORM_SETTINGS_ALIASES) {
    return LEGACY_PLATFORM_SETTINGS_ALIASES[value];
  }
  const allowed = isSuperAdmin ? PLATFORM_SETTINGS_SECTION_IDS : OPERATOR_SETTINGS_SECTION_IDS;
  if (!(allowed as readonly string[]).includes(value)) return undefined;
  return value as InternalSettingsSectionId;
}

export function internalSettingsSectionHref(section: InternalSettingsSectionId): string {
  if (section === "general") return "/internal/?section=settings";
  return `/internal/?section=settings&settingsSection=${section}`;
}

export const INTERNAL_CONSOLE_APP_VERSION = "0.1.0";
