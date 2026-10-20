"use client";

import { Source, SourceContent, SourceTrigger } from "@/components/ui/source";
import type { EvidenceSource } from "@/lib/chat-preview";
import {
  evidenceSourceDescription,
  evidenceSourceHref,
} from "@/lib/aria-message-sources";
import { cn } from "@/lib/utils";

export type AriaEvidenceSourcesProps = {
  sources: readonly EvidenceSource[];
  className?: string;
};

/** prompt-kit Source pills for ARIA Intelligence / preview citations. */
export function AriaEvidenceSources({ sources, className }: AriaEvidenceSourcesProps) {
  if (!sources.length) return null;

  return (
    <div
      className={cn("aria-evidence-sources flex flex-wrap items-center gap-1.5", className)}
      aria-label="Sources used in this answer"
    >
      <span className="text-muted-foreground mr-0.5 text-xs">Sources</span>
      {sources.map((source, index) => (
        <Source key={source.id} href={evidenceSourceHref(source)}>
          <SourceTrigger
            label={index + 1}
            showFavicon={source.kind !== "document"}
            className="aria-evidence-sources__pill h-6 max-w-[8rem] px-2"
          />
          <SourceContent
            title={source.title}
            description={evidenceSourceDescription(source)}
            className="border-border/60 bg-popover z-[1200]"
          />
        </Source>
      ))}
    </div>
  );
}
