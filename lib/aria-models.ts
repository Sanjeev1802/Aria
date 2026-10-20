export const ARIA_AGENT_MODELS = [
  { id: "auto", label: "Auto", description: "Best model for the task" },
  { id: "pro-max", label: "Pro Max", description: "Highest reasoning depth" },
  { id: "aria-plus", label: "ARIA Plus", description: "Balanced speed and quality" },
] as const;

export type AriaAgentModelId = (typeof ARIA_AGENT_MODELS)[number]["id"];

export function ariaModelLabel(model: string) {
  const found = ARIA_AGENT_MODELS.find((m) => m.label === model || m.id === model);
  return found?.label ?? model;
}

/** Map URL param / legacy names to a menu label. */
export function normalizeAriaModelId(model: string | null | undefined): string {
  const raw = model?.trim() ?? "";
  if (!raw) return ARIA_AGENT_MODELS[0].label;
  const found = ARIA_AGENT_MODELS.find(
    (m) => m.id === raw.toLowerCase() || m.label.toLowerCase() === raw.toLowerCase(),
  );
  if (found) return found.label;
  if (/claude|nova/i.test(raw)) return ARIA_AGENT_MODELS[0].label;
  return raw;
}
