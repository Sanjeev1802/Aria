import { createTheme, defaultDarkTheme, type Theme } from "@openuidev/react-ui";

/** System UI stack (SF Pro on Apple platforms). */
export const ARIA_APPLE_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif';

const INTER = /"Inter", sans-serif/g;

function replaceInterInTheme(source: Theme): Theme {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string") {
      mapped[key] = value.replace(INTER, ARIA_APPLE_FONT_FAMILY);
    }
  }
  mapped.fontBody = ARIA_APPLE_FONT_FAMILY;
  mapped.fontHeading = ARIA_APPLE_FONT_FAMILY;
  mapped.fontLabel = ARIA_APPLE_FONT_FAMILY;
  mapped.fontNumbers = ARIA_APPLE_FONT_FAMILY;
  return createTheme(mapped as Theme);
}

export const ariaOpenUIDarkTheme = replaceInterInTheme(defaultDarkTheme);
