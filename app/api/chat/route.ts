import { configuredMaxOutputTokens, modelConfig, streamBedrock } from "@/lib/server/bedrock";
import { localTestModelConfig, streamFakeModel } from "@/lib/server/fake-model";
import { chatHandler, run } from "@/lib/server/handlers";
import { readConfig } from "@/lib/server/services";
import { createSearxngSearch } from "@/lib/server/web-search";
import { cachePublicSearch } from "@/lib/server/cache/search-cache";
import { getElastiCacheSearchCache } from "@/lib/server/cache/elasticache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  const config = readConfig();
  const deps = config.localIdentity
    ? { provider: streamFakeModel, modelConfig: localTestModelConfig, maxOutputTokens: 512 }
    : { provider: streamBedrock, modelConfig, maxOutputTokens: configuredMaxOutputTokens() };
  const publicSearch = config.searxngUrl ? createSearxngSearch(config.searxngUrl) : undefined;
  let searchWeb = publicSearch;
  if (publicSearch && config.elasticacheUrl) {
    try { searchWeb = cachePublicSearch(publicSearch, getElastiCacheSearchCache(config.elasticacheUrl)); }
    catch { console.warn("ARIA public-search cache configuration is invalid; using live search"); }
  }
  return run(request, chatHandler({ ...deps, searchWeb }));
}
