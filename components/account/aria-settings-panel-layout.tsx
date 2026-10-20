"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Shared scrollable content wrapper for every settings tab. */
export function SettingsPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>;
}

/** Section heading + one bordered group (same visual on every tab). */
export function SettingsBlock({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      {title || description ? (
        <div className="space-y-1.5 px-0.5">
          {title ? (
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          ) : null}
          {description ? (
            <p className="text-sm leading-snug text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/15 divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

/** Padded slot inside a block (heatmap, textarea, chips). */
export function SettingsBlockInset({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("px-4 py-4 sm:px-5 sm:py-5", className)}>{children}</div>;
}
