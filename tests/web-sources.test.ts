import test from "node:test";
import assert from "node:assert/strict";
import { domainHue, registrableDomain, splitWebSources } from "../lib/aria-web-sources";
import { webSourceLinks } from "../lib/server/web-search";

/** The exact shape chat-service streams: an OpenUI text program holding JSON-escaped text. */
const program = (text: string) => `root = TextContent("${JSON.stringify(text).slice(1, -1)}")`;
const decode = (body: string) => JSON.parse(`"${body.slice('root = TextContent("'.length, -2)}"`) as string;

const answer = "The Chief Minister is **C. Joseph Vijay**, according to Wikipedia.";
const sources = [
  { title: "Chief Minister of Tamil Nadu", url: "https://en.wikipedia.org/wiki/Chief_Minister_of_Tamil_Nadu", snippet: "" },
  { title: "Vijay [TVK] (profile) *new*", url: "https://www.example.org/a_(b)?q=1", snippet: "" },
];

test("source links are pulled out of the answer and the answer text is left exactly as written", () => {
  const split = splitWebSources(program(answer + webSourceLinks(sources)), false);
  assert.equal(decode(split.body), answer);
  assert.deepEqual(split.sources.map(s => s.domain), ["wikipedia.org", "example.org"], "subdomains and www. are dropped from the name");
  assert.equal(split.sources[0].title, "Chief Minister of Tamil Nadu");
  assert.equal(split.sources[1].title, "Vijay [TVK] (profile) *new*", "markdown escapes are undone");
  assert.equal(split.sources[1].url, "https://www.example.org/a_(b)?q=1", "encoded parentheses are restored");
});

test("while streaming the list is hidden as soon as it starts, so it never flashes as text", () => {
  const full = program(answer + webSourceLinks(sources));
  const partial = full.slice(0, full.indexOf("Web search results") + 40);
  const split = splitWebSources(partial, true);
  assert.deepEqual(split.sources, []);
  assert.ok(!split.body.includes("Web search results"));
  assert.ok(split.body.startsWith('root = TextContent("The Chief Minister'));
});

test("anything that is not exactly our list is left untouched", () => {
  const plain = program("No sources here.");
  assert.deepEqual(splitWebSources(plain, false), { body: plain, sources: [] });
  // The heading appears in the answer, followed by something other than our numbered links.
  const foreign = program("Intro\n\nWeb search results\nare not guaranteed to be complete.");
  assert.deepEqual(splitWebSources(foreign, false), { body: foreign, sources: [] });
  // A list that is cut off before the program ends is not parsed.
  const cut = program(answer + webSourceLinks(sources)).slice(0, -2);
  assert.deepEqual(splitWebSources(cut, false), { body: cut, sources: [] });
  // Non-https links are never turned into chips; the message stays as it was.
  const insecure = program(answer + "\n\nWeb search results\n1. [Bad](http://insecure.example/a)");
  assert.deepEqual(splitWebSources(insecure, false), { body: insecure, sources: [] });
  const script = program(answer + "\n\nWeb search results\n1. [Bad](javascript:alert(1))");
  assert.deepEqual(splitWebSources(script, false), { body: script, sources: [] });
});

test("a source is named by its main site, so every page of one site shares a name and a colour", () => {
  assert.equal(registrableDomain("en.wikipedia.org"), "wikipedia.org");
  assert.equal(registrableDomain("www.bbc.co.uk"), "bbc.co.uk");
  assert.equal(registrableDomain("news.bbc.co.uk"), "bbc.co.uk");
  assert.equal(registrableDomain("bernama.com"), "bernama.com");
  assert.equal(registrableDomain("127.0.0.1"), "127.0.0.1");
  assert.equal(domainHue(registrableDomain("en.wikipedia.org")), domainHue(registrableDomain("de.wikipedia.org")));
});

test("duplicate pages collapse to one chip and each site keeps one stable colour", () => {
  const twice = [...sources, { ...sources[0], title: "Same page again" }];
  assert.equal(splitWebSources(program(answer + webSourceLinks(twice)), false).sources.length, 2);
  assert.equal(domainHue("bernama.com"), domainHue("bernama.com"));
  assert.notEqual(domainHue("bernama.com"), domainHue("wikipedia.org"));
  for (const domain of ["a.com", "en.wikipedia.org", "xn--80ak6aa92e.com"]) {
    const hue = domainHue(domain);
    assert.ok(Number.isInteger(hue) && hue >= 0 && hue < 360);
  }
});
