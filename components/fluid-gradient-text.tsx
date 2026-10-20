"use client";

import { useEffect, useId, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

export type FluidGradientTextProps = {
  text: string;
  svgViewBoxWidth?: number;
  svgViewBoxHeight?: number;
  className?: string;
  /** Outline + cursor spotlight fill (footer). Default uses gradient fill only. */
  variant?: "default" | "spotlight";
};

export function FluidGradientText({
  text,
  svgViewBoxWidth = 1200,
  svgViewBoxHeight = 300,
  className = "",
  variant = "default",
}: FluidGradientTextProps) {
  const gradientId = useId().replace(/:/g, "");
  const maskId = useId().replace(/:/g, "");
  const pointerRaw = useMotionValue(0.22);
  const pointer = useSpring(pointerRaw, { stiffness: 120, damping: 22 });

  const spotlightWidth = svgViewBoxWidth * 0.42;
  const spotlightX = useTransform(
    pointer,
    [0, 1],
    [-spotlightWidth * 0.35, svgViewBoxWidth - spotlightWidth * 0.65]
  );

  const gradientX1 = useSpring(useTransform(pointerRaw, [0, 1], [0, svgViewBoxWidth]), {
    stiffness: 150,
    damping: 25,
  });

  const setPointerFromClientX = (clientX: number, element: HTMLDivElement) => {
    const rect = element.getBoundingClientRect();
    pointerRaw.set((clientX - rect.left) / rect.width);
  };

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const textStyle = {
    fontFamily: '"Saans", var(--font-sans), Helvetica, Arial, sans-serif',
    fontSize: svgViewBoxHeight * 0.88,
    fontWeight: 600 as const,
    letterSpacing: "-0.055em",
  };

  const textY = svgViewBoxHeight * 0.72;

  return (
    <div
      className={`fluid-gradient-text fluid-gradient-text--${variant} ${className}`.trim()}
      onMouseMove={reducedMotion ? undefined : (e) => setPointerFromClientX(e.clientX, e.currentTarget)}
      onMouseLeave={reducedMotion ? undefined : () => pointerRaw.set(0.22)}
      onPointerDown={(e) => setPointerFromClientX(e.clientX, e.currentTarget)}
    >
      <svg
        viewBox={`0 0 ${svgViewBoxWidth} ${svgViewBoxHeight}`}
        preserveAspectRatio="xMidYMax meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {variant === "spotlight" ? (
          <>
            <text
              x="50%"
              y={textY}
              textAnchor="middle"
              dominantBaseline="alphabetic"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              style={textStyle}
              className="fluid-gradient-text-outline"
            >
              {text}
            </text>
            <text
              x="50%"
              y={textY}
              textAnchor="middle"
              dominantBaseline="alphabetic"
              fill="currentColor"
              stroke="none"
              mask={`url(#${maskId})`}
              style={textStyle}
              className="fluid-gradient-text-fill"
            >
              {text}
            </text>
            <defs>
              <mask id={maskId} maskUnits="userSpaceOnUse">
                <rect width={svgViewBoxWidth} height={svgViewBoxHeight} fill="black" />
                {reducedMotion ? (
                  <rect
                    x={svgViewBoxWidth * 0.08}
                    y={0}
                    width={spotlightWidth}
                    height={svgViewBoxHeight}
                    fill="white"
                  />
                ) : (
                  <motion.rect
                    y={0}
                    height={svgViewBoxHeight}
                    width={spotlightWidth}
                    x={spotlightX}
                    fill="white"
                  />
                )}
              </mask>
            </defs>
          </>
        ) : (
          <>
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="2"
              fill={`url(#${gradientId})`}
              style={textStyle}
            >
              {text}
            </text>
            <defs>
              <motion.linearGradient
                id={gradientId}
                x1={reducedMotion ? svgViewBoxWidth * 0.65 : gradientX1}
                y1="0"
                x2={svgViewBoxWidth / 2}
                y2={svgViewBoxHeight}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.625" stopColor="currentColor" stopOpacity="0" />
                <stop offset="1" stopColor="currentColor" />
              </motion.linearGradient>
            </defs>
          </>
        )}
      </svg>
    </div>
  );
}
