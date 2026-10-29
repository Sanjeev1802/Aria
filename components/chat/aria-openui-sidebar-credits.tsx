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

const RING_R = 10;
const RING_C = 2 * Math.PI * RING_R;

function TokenRing({ pct }: { pct: number }) {
  const offset = RING_C - (Math.min(100, Math.max(0, pct)) / 100) * RING_C;
  return (
    <svg className="aria-openui-token-ring" viewBox="0 0 24 24" aria-hidden>
      <circle className="aria-openui-token-ring__track" cx="12" cy="12" r={RING_R} />
      <circle
        className="aria-openui-token-ring__used"
        cx="12"
        cy="12"
        r={RING_R}
        strokeDasharray={RING_C}
        strokeDashoffset={offset}
      />
    </svg>
  );
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

  const { used, included } = credits;
  const pct = included > 0 ? Math.min(100, (used / included) * 100) : 0;
  const empty = included <= 0 && used <= 0;

  return (
    <section
      className="aria-openui-sidebar-credits"
      aria-label={empty ? "Credits unavailable" : `Credits: ${used} of ${included} used this month`}
      title={empty ? "Credits unavailable" : `${formatCredits(used)} / ${formatCredits(included)} credits`}
    >
      <div className="aria-openui-sidebar-credits__head">
        <span className="aria-openui-sidebar-credits__label">
          <span
            className="aria-openui-sidebar-credits__ring"
            role="progressbar"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={included}
            aria-label="Token usage"
          >
            <TokenRing pct={pct} />
          </span>
          <span className="aria-openui-sidebar-credits__title">Credits</span>
        </span>
        <span className="aria-openui-sidebar-credits__values" aria-hidden>
          {empty ? (
            <span className="aria-openui-sidebar-credits__empty">—</span>
          ) : (
            <>
              <span className="aria-openui-sidebar-credits__used">{formatCredits(used)}</span>
              <span className="aria-openui-sidebar-credits__sep">/</span>
              <span className="aria-openui-sidebar-credits__limit">{formatCredits(included)}</span>
            </>
          )}
        </span>
      </div>
    </section>
  );
}

