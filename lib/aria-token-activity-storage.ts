import { loadServerTokenActivity } from "@/lib/aria-sidebar-credits-storage";
export const TOKEN_ACTIVITY_UPDATED_EVENT = "aria:token-activity-updated";
export type TokenActivityByDay = Record<string, number>;
export function loadTokenActivityByDay(): TokenActivityByDay { return loadServerTokenActivity(); }
function formatLocalDate(date: Date): string { return date.toISOString().slice(0, 10); }
function startOfLocalDay(date: Date): Date { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }

export type TokenHeatmapCell = {
  date: string | null;
  count: number;
};

export type TokenHeatmapGrid = {
  weeks: number;
  /** 7 rows (Sun–Sat), each row has `weeks` columns. */
  cells: TokenHeatmapCell[][];
  maxCount: number;
};

export function countToHeatLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (maxCount <= 0) return 1;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export type HeatmapViewMode = "daily" | "weekly" | "cumulative";

function getActivityCounts(): TokenActivityByDay {
  return loadTokenActivityByDay();
}

export function buildTokenActivityHeatmap(weeks = 52): TokenHeatmapGrid {
  const counts = getActivityCounts();
  const end = startOfLocalDay(new Date());
  const spanDays = weeks * 7 - 1;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - spanDays);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const cols =
    Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) / 7) + 1;

  const cells: TokenHeatmapCell[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: cols }, () => ({ date: null, count: 0 })),
  );

  let maxCount = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = formatLocalDate(cursor);
    const count = counts[key] ?? 0;
    if (count > maxCount) maxCount = count;
    const col = Math.floor(
      (cursor.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    const row = cursor.getUTCDay();
    cells[row]![col] = { date: key, count };
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { weeks: cols, cells, maxCount };
}

export function buildTokenActivityWeeklyRow(weeks = 52): {
  weeks: number;
  cells: TokenHeatmapCell[];
  maxCount: number;
} {
  const daily = buildTokenActivityHeatmap(weeks);
  const cols = daily.weeks;
  const cells: TokenHeatmapCell[] = Array.from({ length: cols }, () => ({
    date: null,
    count: 0,
  }));
  let maxCount = 0;

  for (let col = 0; col < cols; col++) {
    let sum = 0;
    let lastDate: string | null = null;
    for (let row = 0; row < 7; row++) {
      const cell = daily.cells[row]?.[col];
      if (!cell) continue;
      sum += cell.count;
      if (cell.date) lastDate = cell.date;
    }
    if (sum > maxCount) maxCount = sum;
    cells[col] = { date: lastDate, count: sum };
  }

  return { weeks: cols, cells, maxCount };
}

export function buildTokenActivityCumulativeHeatmap(weeks = 52): TokenHeatmapGrid {
  const daily = buildTokenActivityHeatmap(weeks);
  let running = 0;
  let maxCount = 0;
  const cells = daily.cells.map(row => row.map(cell => ({ ...cell })));
  for (let col = 0; col < daily.weeks; col++) {
    for (let row = 0; row < 7; row++) {
      const cell = cells[row][col];
      if (!cell.date) continue;
      running += cell.count;
      cell.count = running;
      maxCount = Math.max(maxCount, running);
    }
  }
  return { weeks: daily.weeks, cells, maxCount };
}

export function formatHeatmapTooltip(date: string, count: number): string {
  const parsed = new Date(`${date}T12:00:00`);
  const label = parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const noun = count === 1 ? "token" : "tokens";
  return count > 0 ? `${count} ${noun} on ${label}` : `No tokens on ${label}`;
}
