# Optional ElastiCache for ARIA public search

ARIA can cache **public SearXNG search results** for 120 seconds in ElastiCache Serverless for Valkey or Redis OSS. The cache reduces repeat-search latency and traffic to SearXNG. It does not cache prompts, model responses, sessions, workspace membership, credit balances, or rate-limit decisions. DynamoDB remains authoritative for access and accounting.

This integration is optional. Leave `ARIA_ELASTICACHE_URL` unset until search traffic justifies a cache. ElastiCache Serverless charges for stored data and processing, with a minimum of 1 GB of metered storage per cache; compare its actual cost with the latency and load of running SearXNG directly before enabling it for a small deployment. See [AWS's ElastiCache pricing dimensions](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.corecomponents.html).

## Provision in AWS

1. Create a **Serverless Valkey** cache in the same AWS Region and VPC as the ARIA server. Keep the cache private. Use a security group that permits the ARIA service to reach the cache endpoint on the required Valkey ports. Serverless caches require TLS and use cluster mode.
2. Create an ElastiCache RBAC user with a password and narrowly scoped permissions for cluster discovery plus `GET` and `SETEX` on the `aria:public-search:v1:*` key prefix. Associate that user with the cache's user group. Store the password in AWS Secrets Manager and inject it into the ARIA server environment; do not put it in source, browser code, logs, or a client-visible variable.
3. Set `ARIA_ELASTICACHE_URL` on the ARIA server to a `rediss://username:password@host:port` URL using the cache's **cluster endpoint**. URL-encode special characters in the username and password. Also set `ARIA_SEARXNG_URL`; the cache is unused without public search.
4. From the ARIA runtime network, verify TLS connectivity and the RBAC user's `GET`/`SETEX` permissions. Then search twice for the same public query with Web search enabled and confirm the second request avoids SearXNG. Check that a cache outage still produces a normal live-search response.
5. Monitor cache connections, processing/storage cost, errors, and SearXNG request volume. Remove `ARIA_ELASTICACHE_URL` to disable caching immediately; no data migration is needed.

The Redis client is initialized lazily and reused. Redis Cluster discovery connections explicitly inherit TLS and RBAC credentials. Keys contain a SHA-256 query digest, never the raw query. Cache entries are revalidated before use; malformed entries and cache errors fall back to SearXNG. A cache read/write waits at most 200 ms on the chat path. Search results are public snippets only, but users should still avoid putting private information in a public-web query.

AWS references: [ElastiCache Serverless connections](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.corecomponents.html), [TLS](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html), [RBAC authentication](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth.html).
