/** Customer-facing chat errors. Never name the vendor, model, or env vars. */

export const PUBLIC_CHAT_ERROR = {
  unavailable: "ARIA is temporarily unavailable. Please try again shortly.",
  busy: "ARIA is busy right now. Please try again in a moment.",
  failed: "Something went wrong. Please try again.",
  invalid: "That request could not be sent. Please try again.",
} as const;

const VENDOR_LEAK =
  /\b(bedrock|amazon|nova|gemini|openai|claude|anthropic|aws|api key|quota|throttl|validationexception|accessdenied)\b/i;

export function toPublicChatError(error: unknown): {
  status: number;
  message: string;
} {
  const raw = error instanceof Error ? error.message : "";
  const name = error instanceof Error && "name" in error ? String(error.name) : "";
  const blob = `${name} ${raw}`;

  if (
    name === "ThrottlingException" ||
    /\b(429|throttl|too many requests|quota)\b/i.test(blob)
  ) {
    return { status: 429, message: PUBLIC_CHAT_ERROR.busy };
  }

  if (
    name === "AccessDeniedException" ||
    /not authorized|access denied|api key|BEDROCK_/i.test(blob)
  ) {
    return { status: 503, message: PUBLIC_CHAT_ERROR.unavailable };
  }

  return { status: 502, message: PUBLIC_CHAT_ERROR.failed };
}

export function sanitizePublicError(message: string) {
  if (!message.trim() || VENDOR_LEAK.test(message)) {
    return PUBLIC_CHAT_ERROR.failed;
  }
  return message;
}
