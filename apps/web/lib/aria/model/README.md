# ARIA model layer

Everything that decides **how ARIA thinks and speaks** lives here. The rest of
the app imports from `@/lib/aria/model` and never talks to the provider SDK
directly.

```
lib/aria/model/
├── index.ts        Public API (the only import path the app should use)
├── config.ts       Model name, generation params, env flags
├── client.ts       Provider call + grounding-source extraction
├── format.ts       XML section helpers
├── types.ts        PromptContext and section types
└── prompt/
    ├── index.ts        Assembles sections in order
    ├── identity.ts     <identity>    who ARIA is
    ├── mission.ts      <mission>     what a good answer looks like
    ├── context.ts      <context>     BNII domain knowledge
    ├── voice.ts        <voice>       how ARIA sounds
    ├── behavior.ts     <behavior>    defaults + per-query-type playbook
    ├── rules.ts        <rules>       hard constraints
    ├── tools.ts        <tools>       live search and data availability
    ├── output.ts       <output>      length and formatting
    ├── examples.ts     <examples>    few-shot tone calibration
    ├── runtime.ts      <runtime>     date, timezone, search availability
    └── user-prefs.ts   <user_prefs>  settings, profile, custom instructions
```

## Ordering

Static sections render first and are byte-identical on every request, which keeps
them cache-friendly. Per-request sections (`runtime`, `user_prefs`) render last,
closest to the conversation.

## Editing guide

| Symptom | Edit |
| --- | --- |
| Replies feel robotic or corporate | `voice.ts`, then `examples.ts` |
| Replies are too long or over-formatted | `output.ts` |
| Wrong shape for a kind of question | `behavior.ts` (query playbook) |
| ARIA invents facts or overclaims access | `rules.ts` |
| Domain facts are stale | `context.ts` |
| Date or search behaviour is wrong | `runtime.ts`, `tools.ts` |

Examples move tone faster than adjectives. If a rule isn't landing, demonstrate
it in `examples.ts` instead of adding another line to `voice.ts`.

## Environment

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Required. Provider key. |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.1-flash-lite-preview`. |
| `GEMINI_ENABLE_SEARCH` | Optional. `false` disables live web grounding. |
