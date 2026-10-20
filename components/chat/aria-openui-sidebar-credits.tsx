"use client";

import {
  refreshAriaUsage,
  loadAriaSidebarCredits,
  type AriaSidebarCreditsSnapshot,
} from "@/lib/aria-sidebar-credits-storage";
import { useEffect, useState } from "react";

function formatCredits(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value);
}

export type AriaOpenUISidebarCreditsProps = {
  /** Override snapshot (e.g. tests). */
  initial?: AriaSidebarCreditsSnapshot;
};

export function AriaOpenUISidebarCredits({ initial }: AriaOpenUISidebarCreditsProps) {
  const [credits, setCredits] = useState<AriaSidebarCreditsSnapshot>(
    initial ?? loadAriaSidebarCredits(),
  );

  useEffect(() => {
    if (initial) return;
    let disposed = false;
    const onUsage = () => { void refreshAriaUsage().then(next => { if (!disposed) setCredits(next); }); };
    onUsage();
    window.addEventListener("aria:credits-updated", onUsage);
    window.addEventListener("focus", onUsage);
    return () => { disposed = true; window.removeEventListener("aria:credits-updated", onUsage); window.removeEventListener("focus", onUsage); };
  }, [initial]);

  const { used, included, planLabel } = credits;
  const remaining = credits.available ?? Math.max(0, included - used);
  const pct = included > 0 ? Math.min(100, (used / included) * 100) : 0;

  return (
    <section
      className="aria-openui-sidebar-credits"
      aria-label={`Credits: ${used} of ${included} used this month`}
    >
      <div className="aria-openui-sidebar-credits__head">
        <span className="aria-openui-sidebar-credits__title">Credits</span>
        <span className="aria-openui-sidebar-credits__values" aria-hidden>
          <span className="aria-openui-sidebar-credits__used">{formatCredits(used)}</span>
          <span className="aria-openui-sidebar-credits__sep">/</span>
          <span className="aria-openui-sidebar-credits__limit">{formatCredits(included)}</span>
        </span>
      </div>

      <div
        className="aria-openui-sidebar-credits__track"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={included}
        aria-label="Credit usage"
      >
        <span className="aria-openui-sidebar-credits__bar" style={{ width: `${pct}%` }} />
      </div>

      <p className="aria-openui-sidebar-credits__meta">
        <span>{formatCredits(remaining)} left</span>
        <span className="aria-openui-sidebar-credits__dot" aria-hidden>
          ·
        </span>
        <span>{planLabel}</span>
      </p>

    </section>
  );
}

