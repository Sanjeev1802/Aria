import type { PromptSection } from "./types";

/**
 * Sections are wrapped in XML-style tags. Models follow tagged boundaries more
 * reliably than prose headings, and it keeps modules independently editable.
 */
export function section(tag: string, body: string): PromptSection {
  return { tag, body: body.trim() };
}

export function renderSection({ tag, body }: PromptSection) {
  if (!body) return "";
  return `<${tag}>\n${body}\n</${tag}>`;
}

export function renderSections(sections: PromptSection[]) {
  return sections
    .map(renderSection)
    .filter(Boolean)
    .join("\n\n");
}

export function bullets(lines: (string | false | null | undefined)[]) {
  return lines
    .filter((line): line is string => Boolean(line && line.trim()))
    .map((line) => `- ${line.trim()}`)
    .join("\n");
}
