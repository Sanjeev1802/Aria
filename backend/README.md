# Backend

Service boundaries for ARIA (scaffolded — not implemented in v1).

| Folder | Responsibility |
|--------|----------------|
| `api/` | HTTP API gateway |
| `ai/` | Model orchestration / chat |
| `analytics/` | Atlas / SQL agent services |
| `documents/` | Knowledge indexing |
| `workers/` | Async jobs |

Wire these behind `apps/workspace` when moving past mock replies.
