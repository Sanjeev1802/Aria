"use client";

import {
  buildTokenActivityHeatmap,
  buildTokenActivityWeeklyRow,
  buildTokenActivityCumulativeHeatmap,
  countToHeatLevel,
  formatHeatmapTooltip,
  TOKEN_ACTIVITY_UPDATED_EVENT,
  type HeatmapViewMode,
} from "@/lib/aria-token-activity-storage";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

const MODES: { id: HeatmapViewMode; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "cumulative", label: "Cumulative" },
];

export function AriaTokenActivityHeatmap() {
  const [tick, setTick] = useState(0);
  const [mode, setMode] = useState<HeatmapViewMode>("daily");

  useEffect(() => {
    const onUpdate = () => setTick((n) => n + 1);
    window.addEventListener(TOKEN_ACTIVITY_UPDATED_EVENT, onUpdate);
    window.addEventListener("aria:credits-updated", onUpdate);
    return () => {
      window.removeEventListener(TOKEN_ACTIVITY_UPDATED_EVENT, onUpdate);
      window.removeEventListener("aria:credits-updated", onUpdate);
    };
  }, []);

  const dailyGrid = useMemo(() => buildTokenActivityHeatmap(52), [tick]);
  const weeklyRow = useMemo(() => buildTokenActivityWeeklyRow(52), [tick]);
  const cumulativeGrid = useMemo(() => buildTokenActivityCumulativeHeatmap(52), [tick]);

  const grid =
    mode === "weekly"
      ? { weeks: weeklyRow.weeks, cells: [weeklyRow.cells], maxCount: weeklyRow.maxCount }
      : mode === "cumulative"
        ? cumulativeGrid
        : dailyGrid;

  const rowCount = grid.cells.length;

  return (
    <div className="aria-token-heatmap" aria-labelledby="aria-token-heatmap-title">
      <div className="aria-token-heatmap__head">
        <h2 id="aria-token-heatmap-title" className="aria-token-heatmap__title">
          Token activity
        </h2>
        <div className="aria-token-heatmap__tabs" role="tablist" aria-label="Token activity range">
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              className={cn(
                "aria-token-heatmap__tab",
                mode === id && "aria-token-heatmap__tab--active",
              )}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="aria-token-heatmap__grid aria-token-heatmap__grid--dots"
        role="grid"
        aria-readonly
        style={{
          gridTemplateColumns: `repeat(${grid.weeks}, var(--aria-heatmap-cell))`,
          gridTemplateRows: `repeat(${rowCount}, var(--aria-heatmap-cell))`,
        }}
      >
        {grid.cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const level = countToHeatLevel(cell.count, grid.maxCount);
            const key = cell.date ?? `empty-${rowIndex}-${colIndex}`;
            return (
              <span
                key={key}
                role="gridcell"
                className="aria-token-heatmap__cell"
                data-level={level}
                title={cell.date ? formatHeatmapTooltip(cell.date, cell.count) : undefined}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
