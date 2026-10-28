export const INTERNAL_CONSOLE_LANGUAGE_KEY = "aria-internal-console-language";
export const INTERNAL_CONSOLE_TIMEZONE_KEY = "aria-internal-console-timezone";
export const INTERNAL_CONSOLE_BILLING_PERIOD_KEY = "aria-internal-console-billing-period";

export type InternalConsoleLanguagePreset = "browser" | "en-US" | "en-GB" | "en-IN" | "de-DE" | "fr-FR" | "es-ES" | "ja-JP";
export type InternalConsoleTimezonePreset =
  | "browser"
  | "America/New_York"
  | "America/Chicago"
  | "America/Los_Angeles"
  | "Europe/London"
  | "Europe/Paris"
  | "Asia/Kolkata"
  | "Asia/Tokyo"
  | "Australia/Sydney"
  | "UTC";
export type InternalConsoleBillingPeriod = "utc-month" | "us-eastern-month" | "uk-london-month";

export const INTERNAL_CONSOLE_LANGUAGE_OPTIONS: { value: InternalConsoleLanguagePreset; label: string }[] = [
  { value: "browser", label: "Browser default" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-IN", label: "English (India)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "ja-JP", label: "Japanese (Japan)" },
];

export const INTERNAL_CONSOLE_TIMEZONE_OPTIONS: { value: InternalConsoleTimezonePreset; label: string }[] = [
  { value: "browser", label: "Browser default" },
  { value: "America/New_York", label: "US — Eastern (New York)" },
  { value: "America/Chicago", label: "US — Central (Chicago)" },
  { value: "America/Los_Angeles", label: "US — Pacific (Los Angeles)" },
  { value: "Europe/London", label: "UK — London" },
  { value: "Europe/Paris", label: "Europe — Paris" },
  { value: "Asia/Kolkata", label: "India — Kolkata" },
  { value: "Asia/Tokyo", label: "Japan — Tokyo" },
  { value: "Australia/Sydney", label: "Australia — Sydney" },
  { value: "UTC", label: "UTC" },
];

export const INTERNAL_CONSOLE_BILLING_PERIOD_OPTIONS: { value: InternalConsoleBillingPeriod; label: string }[] = [
  { value: "utc-month", label: "UTC calendar month" },
  { value: "us-eastern-month", label: "US Eastern calendar month" },
  { value: "uk-london-month", label: "UK (London) calendar month" },
];

function browserLanguage(): string {
  if (typeof navigator === "undefined") return "en-US";
  return navigator.language || "en-US";
}

function browserTimeZone(): string {
  if (typeof Intl === "undefined") return "UTC";
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function parseLanguage(stored: string | null): InternalConsoleLanguagePreset {
  if (stored && INTERNAL_CONSOLE_LANGUAGE_OPTIONS.some(o => o.value === stored)) {
    return stored as InternalConsoleLanguagePreset;
  }
  return "browser";
}

function parseTimeZone(stored: string | null): InternalConsoleTimezonePreset {
  if (stored && INTERNAL_CONSOLE_TIMEZONE_OPTIONS.some(o => o.value === stored)) {
    return stored as InternalConsoleTimezonePreset;
  }
  return "browser";
}

function parseBillingPeriod(stored: string | null): InternalConsoleBillingPeriod {
  if (stored && INTERNAL_CONSOLE_BILLING_PERIOD_OPTIONS.some(o => o.value === stored)) {
    return stored as InternalConsoleBillingPeriod;
  }
  return "utc-month";
}

export function readInternalConsoleLanguagePreset(): InternalConsoleLanguagePreset {
  if (typeof window === "undefined") return "browser";
  return parseLanguage(window.localStorage.getItem(INTERNAL_CONSOLE_LANGUAGE_KEY));
}

export function readInternalConsoleTimezonePreset(): InternalConsoleTimezonePreset {
  if (typeof window === "undefined") return "browser";
  return parseTimeZone(window.localStorage.getItem(INTERNAL_CONSOLE_TIMEZONE_KEY));
}

export function readInternalConsoleBillingPeriod(): InternalConsoleBillingPeriod {
  if (typeof window === "undefined") return "utc-month";
  return parseBillingPeriod(window.localStorage.getItem(INTERNAL_CONSOLE_BILLING_PERIOD_KEY));
}

export function writeInternalConsoleLanguagePreset(value: InternalConsoleLanguagePreset) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTERNAL_CONSOLE_LANGUAGE_KEY, value);
}

export function writeInternalConsoleTimezonePreset(value: InternalConsoleTimezonePreset) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTERNAL_CONSOLE_TIMEZONE_KEY, value);
}

export function writeInternalConsoleBillingPeriod(value: InternalConsoleBillingPeriod) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTERNAL_CONSOLE_BILLING_PERIOD_KEY, value);
}

export function resolveInternalConsoleLanguage(preset: InternalConsoleLanguagePreset): string {
  return preset === "browser" ? browserLanguage() : preset;
}

export function resolveInternalConsoleTimeZone(preset: InternalConsoleTimezonePreset): string {
  return preset === "browser" ? browserTimeZone() : preset;
}

export function billingPeriodLabel(period: InternalConsoleBillingPeriod): string {
  return INTERNAL_CONSOLE_BILLING_PERIOD_OPTIONS.find(o => o.value === period)?.label ?? "UTC calendar month";
}

export function formatInternalConsoleDateTime(language: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(language, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(new Date());
  } catch {
    return "—";
  }
}
