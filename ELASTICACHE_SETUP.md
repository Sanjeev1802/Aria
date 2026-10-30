# Optional ElastiCache for ARIA search and chat FAQ cache

ARIA can use ElastiCache Serverless for Valkey or Redis OSS in two ways:

1. **Public SearXNG search** — results cached for **120 seconds** under `aria:public-search:v1:*`.
2. **Repeat chat questions** — first-turn answers cached for **30 days** under `aria:chat-response:v1:*` (SHA-256 key; no raw prompt stored). Greetings such as hi, hello, and how are you are also pre-warmed at startup. Time-sensitive questions stay on built-in replies, not the cache.

Sessions, workspace membership, credit balances, and rate-limit counters remain in Aurora PostgreSQL (`store_items`). Only shareable FAQ-style answers are cached; multi-turn threads and web-search turns always call the model (or search) live.

This integration is optional. Leave `ARIA_ELASTICACHE_URL` unset until search traffic justifies a cache. ElastiCache Serverless charges for stored data and processing, with a minimum of 1 GB of metered storage per cache; compare its actual cost with the latency and load of running SearXNG directly before enabling it for a small deployment. See [AWS's ElastiCache pricing dimensions](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.corecomponents.html).

## Provision in AWS

The reproducible stack is [`infra/elasticache-search.yaml`](infra/elasticache-search.yaml). It creates a private Valkey Serverless cache, an app-only security group allowing ports 6379–6380 from the ARIA server security group, an RBAC user limited to the `aria:public-search:v1:*` and `aria:chat-response:v1:*` keyspaces, and a generated password in Secrets Manager.

After `aws login`, confirm the AWS account and Region, then identify the ARIA runtime's VPC, its security group, and at least two private subnet IDs in separate Availability Zones. The ARIA server must run in that VPC (or have private network connectivity to it). A laptop cannot directly connect to a private ElastiCache endpoint.

Deploy with account-specific values, for example:

```sh
aws cloudformation deploy \
  --region ap-southeast-1 \
  --stack-name aria-public-search-cache \
  --template-file infra/elasticache-search.yaml \
  --parameter-overrides VpcId=vpc-REPLACE PrivateSubnetIds=subnet-REPLACE,subnet-REPLACE AppSecurityGroupId=sg-REPLACE
```

Read the stack outputs for the cache host, port, and password secret ARN. Grant the ARIA server permission to read **only that secret**, resolve it server-side at deployment/startup, and set `ARIA_ELASTICACHE_URL=rediss://aria-search:<url-encoded-password>@<cache-host>:<cache-port>` in its private environment. Never commit the URL or print it in deployment logs. Restart the server after setting it. If ARIA is still running only on a developer laptop, leave this variable unset; the live SearXNG fallback remains available.

The stack incurs AWS charges while it exists, even with little traffic. Inspect [AWS pricing](https://aws.amazon.com/elasticache/pricing/) and delete the stack when the cache is no longer needed.

### Acceptance checks

1. In the ARIA runtime network, verify TLS connectivity and that the RBAC user can `GET` and `SETEX` disposable keys under `aria:public-search:v1:*` and `aria:chat-response:v1:*`.
2. With Web search enabled, ask the same public question twice within 120 seconds; the second request should avoid a SearXNG fetch. Check the cache hit/miss metrics and SearXNG access log.
3. Temporarily deny cache access, then retry a public search. It should still return a live SearXNG result; credits and account rules remain in Aurora.
4. Unset `ARIA_ELASTICACHE_URL` to roll back without losing authoritative data.

### Manual alternative

1. Create a **Serverless Valkey** cache in the same AWS Region and VPC as the ARIA server. Keep the cache private. Use a security group that permits the ARIA service to reach the cache endpoint on the required Valkey ports. Serverless caches require TLS and use cluster mode.
2. Create an ElastiCache RBAC user with a password and narrowly scoped permissions for cluster discovery plus `GET` and `SETEX` on `aria:public-search:v1:*` and `aria:chat-response:v1:*`. Associate that user with the cache's user group. Store the password in AWS Secrets Manager and inject it into the ARIA server environment; do not put it in source, browser code, logs, or a client-visible variable.
3. Set `ARIA_ELASTICACHE_URL` on the ARIA server to a `rediss://username:password@host:port` URL using the cache's **cluster endpoint**. URL-encode special characters in the username and password. Search caching additionally requires `ARIA_SEARXNG_URL`; chat FAQ caching works without SearXNG.
4. From the ARIA runtime network, verify TLS connectivity and the RBAC user's `GET`/`SETEX` permissions. Then search twice for the same public query with Web search enabled and confirm the second request avoids SearXNG. Check that a cache outage still produces a normal live-search response.
5. Monitor cache connections, processing/storage cost, errors, and SearXNG request volume. Remove `ARIA_ELASTICACHE_URL` to disable caching immediately; no data migration is needed.

The Redis client is initialized lazily and reused. Redis Cluster discovery connections explicitly inherit TLS and RBAC credentials. Keys contain a SHA-256 query digest, never the raw query. Cache entries are revalidated before use; malformed entries and cache errors fall back to SearXNG. A cache read/write waits at most 200 ms on the chat path. Search results are public snippets only, but users should still avoid putting private information in a public-web query.

AWS references: [ElastiCache Serverless connections](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.corecomponents.html), [TLS](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html), [RBAC authentication](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth.html).
