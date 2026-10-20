import type { InputContent } from "@openuidev/react-headless";

export type ComposerAttachment = {
  id: string;
  name: string;
  mime: string;
  base64: string;
};

const MAX_BYTES = 10 * 1024 * 1024;

export async function readComposerAttachment(file: File): Promise<ComposerAttachment> {
  if (file.size > MAX_BYTES) {
    throw new Error(`"${file.name}" is too large (max 10 MB).`);
  }
  const base64 = await readFileBase64(file);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mime: file.type || "application/octet-stream",
    base64,
  };
}

function readFileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export function buildMessageContent(text: string, attachments: ComposerAttachment[]): string | InputContent[] {
  const parts: InputContent[] = [];

  for (const file of attachments) {
    if (file.mime.startsWith("image/")) {
      parts.push({
        type: "image",
        source: { type: "data", mimeType: file.mime, value: file.base64 },
        metadata: { filename: file.name },
      });
    } else {
      parts.push({
        type: "document",
        source: { type: "data", mimeType: file.mime, value: file.base64 },
        metadata: { filename: file.name },
      });
    }
  }

  const trimmed = text.trim();
  if (trimmed) {
    parts.unshift({ type: "text", text: trimmed });
  }

  if (parts.length === 0) return "";
  if (parts.length === 1 && parts[0].type === "text") {
    return parts[0].text;
  }
  return parts;
}
