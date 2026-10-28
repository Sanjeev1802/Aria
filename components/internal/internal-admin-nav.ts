import type { InternalSection } from "./internal-section";

export type InternalNavTarget =
  | { type: "section"; section: InternalSection }
  | { type: "href"; href: string };

export type InternalNavItem = {
  label: string;
  hint?: string;
  target: InternalNavTarget;
  planned?: boolean;
};

export const INTERNAL_PLATFORM_NAV: InternalNavItem[] = [
  { label: "Overview", target: { type: "section", section: "overview" } },
  { label: "Customers", target: { type: "section", section: "customers" } },
  { label: "Subscription", target: { type: "section", section: "subscription" } },
];

export const INTERNAL_GOVERNANCE_NAV: InternalNavItem[] = [
  { label: "Audit activity", target: { type: "section", section: "activity" } },
  { label: "Operations", target: { type: "section", section: "operations" } },
  { label: "Admin hub", target: { type: "section", section: "admin" } },
];

export const INTERNAL_SHORTCUT_NAV: InternalNavItem[] = [
  { label: "Settings", target: { type: "section", section: "settings" } },
];
