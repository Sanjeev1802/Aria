# Self-hosted public web search for ARIA

ARIA's optional Web search uses the [SearXNG JSON search API](https://docs.searxng.org/dev/search_api.html). It is **public-web search**, not retrieval of authorized ARIA business data. The feature remains off unless `ARIA_SEARXNG_URL` is configured on the ARIA server.

## Run an instance

Use SearXNG's [official container installation guide](https://docs.searxng.org/admin/installation-docker.html) and its maintained Compose template. For local development, bind SearXNG to a loopback port or a private container network. Do not expose an unauthenticated JSON endpoint on the public internet.

Enable JSON in the instance's `settings.yml`:

```yaml
use_default_settings: true
search:
  formats:
    - html
    - json
```

SearXNG's default configuration may allow HTML only; a `format=json` request then returns `403`. Its [search settings documentation](https://docs.searxng.org/admin/settings/settings_search.html) describes this setting. Restart the instance after changing it.

Verify a result before connecting ARIA (adjust the address to your deployment):

```bash
curl -fsS -X POST http://127.0.0.1:8888/search \
  -H 'Accept: application/json' \
  -d 'q=public%20research&format=json&categories=general&safesearch=1'
```

The response must be JSON with a `results` array. Configure the base URL, without `/search`, in ARIA's server environment:

```env
ARIA_SEARXNG_URL=http://127.0.0.1:8888
```

Restart ARIA. A **Web search** toggle appears in the chat composer. Only a question explicitly sent with that toggle enabled is searched. The question must be at most 300 characters and should contain no private information. Do not use this endpoint for workspace documents; those need separate authorization and retrieval.

## How ARIA handles results

- The server makes one POST request with `format=json`, a six-second timeout, no redirects, and a 256 KB response limit.
- It keeps at most five HTTP(S) results with a title and short snippet. Other result types and unsafe links are discarded.
- Bounded excerpts are provided to Bedrock as untrusted data. ARIA does not fetch or claim to have read the full pages.
- The completed answer contains numbered, clickable **Web search results**. These links are saved with the answer, so they remain after reloading the chat.
- A failed or empty search stops before the model call and releases the credit reservation. No search results are silently replaced with an unverified current answer.

SearXNG is a metasearch frontend, so search availability and result quality depend on its upstream engines. Monitor response errors, latency, and CAPTCHA/rate-limit failures as usage grows. Keep the instance reachable only from ARIA's server network and review each upstream provider's terms before public launch. ARIA's normal per-user chat rate limit applies, but a deployment-wide search capacity policy is still needed for a 500-user release.
