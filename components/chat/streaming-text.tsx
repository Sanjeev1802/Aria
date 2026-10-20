"use client";

import { useEffect, useRef } from "react";

function ms(name: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

/** transitions.dev 30-streaming-text — resolve words through opacity + blur */
export function StreamingText({ text }: { text: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const animatedCount = useRef(0);
  const prevText = useRef("");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (text.length < prevText.current.length) {
      animatedCount.current = 0;
      root.textContent = "";
    }
    prevText.current = text;

    const parts = text.split(/(\s+)/);
    const wordIndices: number[] = [];
    parts.forEach((part, i) => {
      if (part.trim()) wordIndices.push(i);
    });

    if (wordIndices.length < animatedCount.current) {
      animatedCount.current = 0;
      root.textContent = "";
    }

    while (root.childNodes.length < parts.length) {
      const i = root.childNodes.length;
      const part = parts[i];
      if (!part.trim()) {
        root.appendChild(document.createTextNode(part));
      } else {
        const span = document.createElement("span");
        span.className = "t-stream-w";
        span.textContent = part;
        root.appendChild(span);
      }
    }

    const gap = ms("--stream-gap", 60);
    let wordNum = 0;
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i].trim()) continue;
      wordNum++;
      if (wordNum <= animatedCount.current) continue;
      const node = root.childNodes[i] as HTMLElement;
      if (!node?.classList?.contains("t-stream-w")) continue;
      const delay = (wordNum - animatedCount.current - 1) * gap;
      window.setTimeout(() => node.classList.add("is-in"), delay);
    }
    animatedCount.current = wordNum;
  }, [text]);

  return <div ref={rootRef} className="t-stream whitespace-pre-wrap" aria-live="polite" />;
}
