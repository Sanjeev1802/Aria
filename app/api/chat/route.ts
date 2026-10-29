import { configuredMaxOutputTokens, modelConfig, streamBedrock } from "@/lib/server/bedrock";
import { localTestModelConfig, streamFakeModel } from "@/lib/server/fake-model";
import { claudeConfigured, claudeModelConfig, streamClaude } from "@/lib/server/anthropic";
import { withFallback } from "@/lib/server/provider-fallback";
import { chatHandler, run } from "@/lib/server/handlers";
import { readConfig } from "@/lib/server/services";
import { createSearxngSearch } from "@/lib/server/web-search";
import { cachePublicSearch } from "@/lib/server/cache/search-cache";
import { getElastiCacheSearchCache } from "@/lib/server/cache/elasticache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  const config = readConfig();
  // Claude answers when a key is configured; Nova on Bedrock takes over if Claude
  // fails before streaming. Reservations use Claude's rates, the higher of the two.
  // Local identity still uses the fake model unless a Claude key is present.
  const deps = claudeConfigured()
    ? { provider: withFallback(streamClaude, { provider: streamBedrock, config: () => modelConfig("nova") }),
      modelConfig: () => claudeModelConfig(), maxOutputTokens: configuredMaxOutputTokens() }
    : config.localIdentity
      ? { provider: streamFakeModel, modelConfig: localTestModelConfig, maxOutputTokens: 512 }
      : { provider: streamBedrock, modelConfig, maxOutputTokens: configuredMaxOutputTokens() };
  const publicSearch = config.searxngUrl ? createSearxngSearch(config.searxngUrl) : undefined;
  let searchWeb = publicSearch;
  if (publicSearch && config.elasticacheUrl) {
    try { searchWeb = cachePublicSearch(publicSearch, getElastiCacheSearchCache(config.elasticacheUrl)); }
    catch { console.warn("ARIA public-search cache configuration is invalid; using live search"); }
  }
  // Claude searches the web itself, at most maxUses times, only when a question needs current facts.
  const nativeSearch = !config.localIdentity && claudeConfigured() && (config.claudeWebSearchMaxUses ?? 0) > 0
    ? { maxUses: config.claudeWebSearchMaxUses as number } : undefined;
  return run(request, chatHandler({ ...deps, searchWeb, nativeSearch }));
}
