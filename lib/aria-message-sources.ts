import type { EvidenceSource } from "@/lib/chat-preview";

const EMPTY_SOURCES: readonly EvidenceSource[] = [];

const sourcesByMessageId = new Map<string, readonly EvidenceSource[]>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setAssistantMessageSources(messageId: string, sources: EvidenceSource[]) {
  if (!messageId) return;

  if (sources.length === 0) {
    if (!sourcesByMessageId.has(messageId)) return;
    sourcesByMessageId.delete(messageId);
    emit();
    return;
  }

  const frozen = Object.freeze([...sources]) as readonly EvidenceSource[];
  const prev = sourcesByMessageId.get(messageId);
  if (
    prev &&
    prev.length === frozen.length &&
    prev.every((item, index) => item.id === frozen[index]?.id)
  ) {
    return;
  }

  sourcesByMessageId.set(messageId, frozen);
  emit();
}

export function getAssistantMessageSources(messageId: string): readonly EvidenceSource[] {
  return sourcesByMessageId.get(messageId) ?? EMPTY_SOURCES;
}

export function subscribeAssistantMessageSources(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function evidenceSourceHref(source: EvidenceSource): string {
  const slug = encodeURIComponent(source.id);
  if (source.kind === "document") {
    return `https://aria.local/preview/document/${slug}`;
  }
  return `https://aria.local/preview/dataset/${slug}`;
}

export function evidenceSourceDescription(source: EvidenceSource): string {
  return [source.scope, source.period, source.freshness, source.detail]
    .filter(Boolean)
    .join(" · ");
}
