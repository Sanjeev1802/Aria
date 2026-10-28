export type InternalSection =
  | "overview"
  | "customers"
  | "subscription"
  | "activity"
  | "operations"
  | "admin"
  | "team"
  | "profile"
  | "settings";

const SECTIONS: InternalSection[] = [
  "overview",
  "customers",
  "subscription",
  "activity",
  "operations",
  "admin",
  "team",
  "profile",
  "settings",
];

export function parseInternalSection(value: string | null): InternalSection {
  if (value === "plans") return "subscription";
  if (value === "workspaces") return "customers";
  if (value && SECTIONS.includes(value as InternalSection)) return value as InternalSection;
  return "overview";
}

export function internalSectionHref(section: InternalSection): string {
  return section === "overview" ? "/internal/" : `/internal/?section=${section}`;
}

export function internalSectionLabel(section: InternalSection): string {
  switch (section) {
    case "overview":
      return "Overview";
    case "customers":
      return "Customers";
    case "subscription":
      return "Subscription";
    case "activity":
      return "Audit activity";
    case "operations":
      return "Operations";
    case "admin":
      return "Admin";
    case "team":
      return "ARIA Team";
    case "profile":
      return "Your profile";
    case "settings":
      return "Settings";
  }
}

export function internalSectionBreadcrumb(section: InternalSection): string {
  if (section === "profile" || section === "settings") return "Account";
  if (section === "admin" || section === "team" || section === "activity" || section === "operations") return "Governance";
  return "Platform";
}

/** Page intro eyebrow — matches sidebar grouping (Platform / Governance / Account). */
export function internalSectionEyebrow(section: InternalSection): string {
  switch (internalSectionBreadcrumb(section)) {
    case "Governance":
      return "Governance";
    case "Account":
      return "Operator account";
    default:
      return "Platform operations";
  }
}
