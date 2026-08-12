"use client";

import { formatTokenCount } from "@/lib/aria/tokens";

type TokenUsageBarProps = {
  used: number;
  limit: number;
  compact?: boolean;
  /** Collapsed sidebar: show only a progress rail */
  rail?: boolean;
};

export function TokenUsageBar({
  used,
  limit,
  compact,
  rail,
}: TokenUsageBarProps) {
  const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const nearLimit = pct >= 85;
  const atLimit = pct >= 100;
  const fillClass = atLimit
    ? "bg-red-700"
    : nearLimit
      ? "bg-accent"
      : "bg-foreground/55";

  if (rail) {
    return (
      <div
        className="mx-auto flex w-full max-w-[1.75rem] flex-col items-center gap-1"
        title={`${used.toLocaleString()} / ${limit.toLocaleString()} tokens`}
      >
        <div className="relative h-16 w-1.5 overflow-hidden rounded-full bg-foreground/10">
          <div
            className={`absolute bottom-0 left-0 w-full rounded-full transition-[height] duration-300 ${fillClass}`}
            style={{ height: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "flex min-w-0 flex-col gap-1"
          : "flex min-w-0 flex-col gap-1.5 rounded-xl border border-foreground/10 bg-background/70 px-2.5 py-2"
      }
      title={`${used.toLocaleString()} / ${limit.toLocaleString()} tokens`}
    >
      {!compact ? (
        <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-[0.1em] text-foreground/45">
          <span>Token usage</span>
          <span
            className={
              atLimit
                ? "text-red-700"
                : nearLimit
                  ? "text-accent"
                  : "text-foreground/55"
            }
          >
            {formatTokenCount(used)} / {formatTokenCount(limit)}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-[11px] text-foreground/55">
          <span>Tokens</span>
          <span
            className={
              atLimit
                ? "font-medium text-red-700"
                : nearLimit
                  ? "font-medium text-accent"
                  : ""
            }
          >
            {formatTokenCount(used)}/{formatTokenCount(limit)}
          </span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
