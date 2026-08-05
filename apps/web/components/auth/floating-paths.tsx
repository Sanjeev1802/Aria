"use client";

import { motion } from "motion/react";

export function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <svg
        className="h-full w-full text-foreground"
        fill="none"
        viewBox="0 0 696 316"
        aria-hidden="true"
      >
        {paths.map((path) => (
          <motion.path
            key={`${position}-${path.id}`}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.12 + path.id * 0.02}
            fill="none"
            initial={false}
            animate={{
              pathLength: 0.45,
              pathOffset: [0, 1, 0],
            }}
            transition={{
              pathOffset: {
                duration: 40 + path.id * 0.8,
                repeat: Infinity,
                ease: "linear",
              },
              pathLength: {
                duration: 0,
              },
            }}
          />
        ))}
      </svg>
    </div>
  );
}
