/**
 * The server appends cited web pages to an answer as a markdown list under "Web search
 * results". The chat shows them as source chips instead, so this separates that list from
 * the answer text. Only https links survive; everything else stays in the text untouched.
 */
export type WebSourceLink = { title: string; url: string; domain: string };

// Inside an OpenUI program the text is a JSON string, so newlines appear as the characters \n.
const MARKER = "\\n\\nWeb search results\\n";
const TEXT_PROGRAM_END = '")';

const GENERIC_SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "edu", "ac"]);

/** "en.wikipedia.org" -> "wikipedia.org", "www.bbc.co.uk" -> "bbc.co.uk"; IP addresses are left alone. */
export function registrableDomain(host: string) {
  const parts = host.replace(/^www\./, "").toLowerCase().split(".");
  if (parts.length <= 2 || parts.every(part => /^\d+$/.test(part)) || host.includes(":")) return parts.join(".");
  return parts.slice(GENERIC_SECOND_LEVEL.has(parts[parts.length - 2]) ? -3 : -2).join(".");
}

function unescapeMarkdown(value: string) {
  return value.replace(/\\([\\[\]()*_`<>])/g, "$1");
}

function parseLine(line: string): WebSourceLink | undefined {
  const match = /^\d+\.\s+\[(.+)\]\(([^)\s]+)\)\s*$/.exec(line);
  if (!match) return undefined;
  try {
    const url = new URL(match[2].replace(/%28/g, "(").replace(/%29/g, ")"));
    if (url.protocol !== "https:") return undefined;
    return { title: unescapeMarkdown(match[1]) || url.hostname, url: url.toString(), domain: registrableDomain(url.hostname) };
  } catch { return undefined; }
}

/**
 * Splits an assistant message program into the answer to render and the source links.
 * While streaming, the list is hidden as soon as it starts so it never flashes as plain text.
 */
export function splitWebSources(program: string, isStreaming: boolean): { body: string; sources: WebSourceLink[] } {
  const at = program.lastIndexOf(MARKER);
  if (at < 0) return { body: program, sources: [] };
  const head = program.slice(0, at);
  if (isStreaming) return { body: head, sources: [] };
  const tail = program.slice(at + MARKER.length);
  if (!tail.endsWith(TEXT_PROGRAM_END)) return { body: program, sources: [] };
  let list: string;
  try { list = JSON.parse(`"${tail.slice(0, -TEXT_PROGRAM_END.length)}"`); }
  catch { return { body: program, sources: [] }; }
  const parsed = list.split("\n").map(parseLine);
  // Not a list we wrote: leave the message exactly as it is.
  if (!parsed.length || parsed.some(source => !source)) return { body: program, sources: [] };
  const seen = new Set<string>();
  const sources = (parsed as WebSourceLink[]).filter(source => !seen.has(source.url) && seen.add(source.url));
  return { body: head + TEXT_PROGRAM_END, sources };
}

/** Stable hue (0-359) per site, so each source keeps its avatar colour. */
export function domainHue(domain: string) {
  let hash = 0;
  for (const char of domain) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}
