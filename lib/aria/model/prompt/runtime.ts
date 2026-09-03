import { bullets, section } from "../format";
import type { PromptContext } from "../types";

function resolveNow(now: PromptContext["now"]) {
  if (now instanceof Date) return now;
  if (typeof now === "string") {
    const parsed = new Date(now);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function resolveTimeZone(timeZone: PromptContext["timeZone"]) {
  return (
    timeZone?.trim() ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC"
  );
}

/**
 * Models have no reliable sense of "now". The client sends its clock and
 * timezone on every request so date questions resolve to reality rather than a
 * training cutoff.
 */
export const runtime = (context: PromptContext) => {
  const now = resolveNow(context.now);
  const timeZone = resolveTimeZone(context.timeZone);

  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(now);

  const today = format({
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const localTime = format({ hour: "numeric", minute: "2-digit", hour12: true });

  return section(
    "runtime",
    `Authoritative environment for this request.

${bullets([
  `Today is ${today}.`,
  `Local time for the user: ${localTime} (${timeZone}).`,
  `UTC timestamp: ${now.toISOString()}.`,
  context.liveSearch
    ? "Live web search: ON. Use it for current events and time-sensitive facts."
    : "Live web search: OFF. No search tool on this request — do not present current headlines as verified.",
  "Answer every date, time, or \"today\" question from this block — never from training memory.",
  "Resolve relative language (today, this week, next quarter) against this timestamp.",
])}`,
  );
};
