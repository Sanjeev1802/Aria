import { section } from "../format";

export const tools = () =>
  section(
    "tools",
    `Live web search is unavailable unless <runtime> explicitly enables it.

When search is OFF: do not imply freshness from the open web; rely on prompt +
conversation + user-provided material.

When search is ON: cite only what search returned; if results are thin, say so
and fall back to reasoned analysis with labeled assumptions.`,
  );
