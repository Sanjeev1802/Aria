import test from "node:test";
import assert from "node:assert/strict";
import { boundedWebContext, createSearxngSearch, normalizeWebSources, searchQuery, webSourceLinks, WebSearchError } from "../lib/server/web-search";

test("SearXNG adapter posts a bounded JSON search and keeps only safe source links", async () => {
  let requestedUrl = "";
  let params: URLSearchParams | undefined;
  const fetcher: typeof fetch = async (url, init) => {
    requestedUrl = String(url);
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "error");
    params = new URLSearchParams(String(init?.body));
    return Response.json({ results: [
      { title: "Good source", url: "https://example.org/article#section", content: "An informative result" },
      { title: "Duplicate", url: "https://example.org/article", content: "Repeated" },
      { title: "Bad scheme", url: "javascript:alert(1)", content: "Ignore" },
      { title: "No content", url: "https://example.org/empty", content: "" },
    ] });
  };
  const search = createSearxngSearch("http://127.0.0.1:8888", fetcher);
  const sources = await search("ARIA public search", new AbortController().signal);
  assert.equal(requestedUrl, "http://127.0.0.1:8888/search");
  assert.equal(params?.get("format"), "json");
  assert.equal(params?.get("q"), "ARIA public search");
  assert.deepEqual(sources, [{ title: "Good source", url: "https://example.org/article", snippet: "An informative result" }]);
  assert.match(webSourceLinks(sources), /\[Good source\]\(https:\/\/example.org\/article\)/);
});

test("search input, endpoint, result size, and untrusted content are bounded", async () => {
  assert.throws(() => searchQuery("x".repeat(301)), WebSearchError);
  assert.throws(() => createSearxngSearch("file:///tmp/secret"), WebSearchError);
  assert.throws(() => normalizeWebSources({ wrong: [] }), WebSearchError);
  const sources = normalizeWebSources({ results: Array.from({ length: 12 }, (_, i) => ({
    title: `Result ${i}`, url: `https://example.org/${i}`, content: "Read this site",
  })) });
  assert.equal(sources.length, 5);
  assert.ok(Buffer.byteLength(boundedWebContext(sources).context) <= 6_000);
  const oversized: typeof fetch = async () => new Response("x".repeat(260_000), { headers: { "Content-Type": "application/json" } });
  await assert.rejects(createSearxngSearch("https://search.example.org", oversized)("test", new AbortController().signal), WebSearchError);
});
