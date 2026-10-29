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
    <section className="aria-settings-block">
      {title || description ? (
        <div className="space-y-1">
          {title ? <h3 className="aria-settings-block__title">{title}</h3> : null}
          {description ? <p className="aria-settings-block__desc">{description}</p> : null}
        </div>
      ) : null}
      <div className="aria-settings-block__card">{children}</div>
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
  return <div className={cn("px-4 py-4", className)}>{children}</div>;
}
