"use client";

import { useEffect, useRef, useState } from "react";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Tweens a number from what is on screen to `value`, so a first load counts up and a
 * live refresh glides to the new figure instead of jumping. Screen readers get the final
 * value immediately; reduced-motion users get no tween.
 */
export function CountUp({
  value,
  format = (n: number) => String(Math.round(n)),
  duration = 750,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const from = shownRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      start ||= now;
      const t = reduced || from === value ? 1 : Math.min(1, (now - start) / duration);
      const next = from + (value - from) * easeOutCubic(t);
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <>
      <span aria-hidden="true" className="tabular-nums">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
