# ARIA model layer

Everything that decides **how ARIA thinks and speaks** lives here. The rest of
the app imports from `@/lib/aria/model` and never talks to the provider SDK
directly.

```
lib/aria/model/
├── index.ts        Public API (the only import path the app should use)
├── config.ts       Model name, generation params, env flags
├── client.ts       Bedrock Converse call
├── format.ts       XML section helpers
├── types.ts        PromptContext and section types
└── prompt/
    ├── index.ts        Assembles sections in order
    ├── identity.ts     <identity>    who ARIA is
    ├── rules.ts        <rules>       hard constraints (rendered second)
    ├── mission.ts      <mission>     what a good answer looks like
    ├── context.ts      <context>     BNII domain knowledge
    ├── voice.ts        <voice>       how ARIA sounds
    ├── behavior.ts     <behavior>    defaults + per-query-type playbook
    ├── tools.ts        <tools>       live search and data availability
    ├── output.ts       <output>      length and formatting
    ├── examples.ts     <examples>    few-shot tone calibration
    ├── runtime.ts      <runtime>     date, timezone, search availability
    └── user-prefs.ts   <user_prefs>  settings, profile, custom instructions
```

## Ordering

Identity and rules render first so constraints are not buried. Remaining static
sections are byte-identical on every request. Per-request sections (`runtime`,
`user_prefs`) render last, closest to the conversation.

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
| `ANTHROPIC_API_KEY` | Preferred. Direct Anthropic API key (`sk-ant-...`). |
| `ANTHROPIC_MODEL_ID` | Optional. Defaults to `claude-sonnet-4-6`. |
| `BEDROCK_API_KEY` | Fallback when `ANTHROPIC_API_KEY` is unset. |
| `BEDROCK_REGION` | Optional. Defaults to `ap-southeast-1`. |
| `BEDROCK_MODEL_ID` | Optional. Defaults to `apac.amazon.nova-micro-v1:0`. |
| `BEDROCK_ENABLE_SEARCH` | Optional. Leave unset/false until a search tool is wired. |
