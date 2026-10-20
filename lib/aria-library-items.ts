export type AriaLibraryItemKind = "pdf" | "chat" | "link" | "invite" | "document";

export type AriaLibraryItem = {
  id: string;
  kind: AriaLibraryItemKind;
  title: string;
  subtitle?: string;
  /** Short preview line for chat-style cards */
  preview?: string;
  favorite?: boolean;
};

const STORAGE_KEY = "aria-library-items";

export function loadAriaLibraryItems(): AriaLibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AriaLibraryItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as AriaLibraryItem).id === "string" &&
        typeof (item as AriaLibraryItem).title === "string" &&
        typeof (item as AriaLibraryItem).kind === "string",
    );
  } catch {
    return [];
  }
}

export function saveAriaLibraryItems(items: AriaLibraryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // Storage blocked or quota exceeded.
  }
}
