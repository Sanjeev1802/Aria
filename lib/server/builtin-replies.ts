import type { ChatInput } from "./chat-input";

const GREET = new Set([
  "hi", "hii", "hiii", "hello", "hey", "yo", "howdy", "sup",
  "hi there", "hey there", "hello there",
  "hi aria", "hey aria", "hello aria",
  "good morning", "good afternoon", "good evening",
  "morning", "afternoon", "evening",
  "what's up", "whats up",
]);

const IDENTITY = new Set([
  "who are you", "who r you", "who r u", "who are u",
  "what are you", "what r you",
  "what is aria", "what's aria", "whats aria", "who is aria",
  "tell me about yourself", "introduce yourself", "introduce you",
]);

const HELP = new Set([
  "what can you do", "how can you help", "what do you do",
  "how do you work", "what can aria do",
]);

const THANKS = new Set([
  "thanks", "thank you", "thank you so much", "thx", "ty", "thanks aria",
]);

const HOW_ARE_YOU = new Set([
  "how are you", "how r you", "how r u", "how are u", "how's it going", "hows it going",
  "how do you do", "how you doing", "how are you doing", "how are you today",
]);

const TIME = new Set([
  "time", "what time is it", "what's the time", "whats the time", "what time",
  "tell me the time", "current time",
]);

/** Normalizes a short user phrase for greeting, cache, and FAQ matching. */
export function normalizeChatPhrase(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatLocalTime(now: Date) {
  try {
    return now.toLocaleString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  } catch {
    return now.toISOString();
  }
}

function lastUserText(input: ChatInput) {
  const last = [...input.messages].reverse().find(message => message.role === "user");
  return last?.content.map(part => part.text).join("\n") ?? "";
}

/** Short social or identity turns that ARIA answers itself, without a model. */
export function builtinReply(input: ChatInput): string | undefined {
  const raw = lastUserText(input);
  if (!raw || raw.length > 80) return undefined;
  const text = normalizeChatPhrase(raw);
  if (!text || text.split(" ").length > 8) return undefined;
  if (GREET.has(text)) return "Hello. What can I help you with?";
  if (HOW_ARE_YOU.has(text)) return "I'm here and ready to help. What would you like to work on?";
  if (TIME.has(text)) return `It's ${formatLocalTime(new Date())} on the server clock. For your exact local time, check your device.`;
  if (IDENTITY.has(text)) {
    return "I'm ARIA, from The Binary Labs. I help you think through information, make decisions, and get work done in this workspace. What do you need?";
  }
  if (HELP.has(text)) {
    return "I can help you draft, explain, compare options, and work through decisions in this conversation. Ask a question to start.";
  }
  if (THANKS.has(text)) return "You're welcome. What should we look at next?";
  return undefined;
}
