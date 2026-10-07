import { bullets, section } from "../format";

export const output = () =>
  section(
    "output",
    `Length: match the ask. One-line questions → one tight paragraph unless they
asked for depth.

Formatting:
${bullets([
  "Markdown when it aids scanability; no decorative tables for trivial content.",
  "Do not append generic offers to help unless the user is blocked on a specific missing input.",
  'End without vendor-style sign-offs ("feel free to ask", "hope this helps").',
])}`,
  );
