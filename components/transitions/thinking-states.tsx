"use client";

import { useEffect, useRef } from "react";

function readMs(name: string, fallback: number) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

type Props = {
  states: readonly string[];
  /** Hidden sizer copy — use the longest state string. */
  sizerLabel?: string;
  className?: string;
  /** Run through all states once, then call `onComplete`. Omit to loop forever. */
  runOnce?: boolean;
  onComplete?: () => void;
};

/** transitions.dev #28 — Thinking states (React). */
export function ThinkingStates({ states, sizerLabel, className = "", runOnce = false, onComplete }: Props) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement | null>(null);
  const indexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const initial = states[0] ?? "Thinking…";
  const sizer = sizerLabel ?? states.reduce((a, b) => (a.length >= b.length ? a : b), initial);

  useEffect(() => {
    if (!states.length) return;

    if (runOnce && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => onCompleteRef.current?.(), 120);
      return () => window.clearTimeout(id);
    }

    const box = boxRef.current;
    if (!box) return;

    liveRef.current = box.querySelector(".t-think-text");
    indexRef.current = 0;
    doneRef.current = false;

    function cycle() {
      if (doneRef.current) return;

      const hold = readMs("--think-hold", 2000);
      timerRef.current = window.setTimeout(() => {
        if (doneRef.current) return;

        if (runOnce && indexRef.current >= states.length - 1) {
          doneRef.current = true;
          onCompleteRef.current?.();
          return;
        }

        const swap = readMs("--think-swap", 150);
        const gap = readMs("--think-gap", 50);
        const live = liveRef.current;
        if (!live || !box) return;

        live.classList.add("is-exit");
        indexRef.current = runOnce ? indexRef.current + 1 : (indexRef.current + 1) % states.length;
        const label = states[indexRef.current];

        const next = document.createElement("span");
        next.className = "t-think-text is-enter-start";
        next.textContent = label;
        next.setAttribute("data-text", label);
        box.appendChild(next);
        liveRef.current = next;

        const release = () => {
          void next.offsetWidth;
          next.classList.remove("is-enter-start");
        };
        if (gap > 0) window.setTimeout(release, gap);
        else release();

        window.setTimeout(() => {
          live.remove();
          cycle();
        }, swap + gap);
      }, hold);
    }

    cycle();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [states, runOnce]);

  return (
    <span className={`t-think ${className}`.trim()} role="status" ref={boxRef}>
      <span className="t-think-sizer" aria-hidden="true">
        {sizer}
      </span>
      <span className="t-think-text" data-text={initial}>
        {initial}
      </span>
    </span>
  );
}
