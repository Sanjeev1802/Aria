"use client";

import { useEffect, type RefObject } from "react";

declare global {
  interface Window {
    TdevBeam?: { mount: (el: HTMLElement) => void };
  }
}

function loadBeamScript(): Promise<void> {
  if (window.TdevBeam) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tdev-beam="1"]');
    if (existing) {
      if (window.TdevBeam) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("beam.js failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "/vendor/beam.js";
    script.async = true;
    script.dataset.tdevBeam = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("beam.js failed to load"));
    document.body.appendChild(script);
  });
}

/** Mount the colorful prompt-bar beam. Always uses the dark beam palette so the rim stays iridescent, not black, in Light. */
export function useTdevBeam(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;

    const start = () => {
      loadBeamScript()
        .then(() => {
          const target = ref.current;
          if (cancelled || !target || !window.TdevBeam) return;
          // beam.js keys off html[data-theme]; keep dark so the rim stays colorful in Light.
          document.documentElement.setAttribute("data-theme", "dark");
          window.TdevBeam.mount(target);
        })
        .catch(() => {});
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => {
        cancelled = true;
      };
    }

    start();

    return () => {
      cancelled = true;
    };
  }, [ref]);
}
