import { anthropicConfigured, anthropicModelConfig, streamAnthropic } from "@/lib/server/anthropic";
import { modelConfig, streamBedrock, MAX_OUTPUT_TOKENS } from "@/lib/server/bedrock";
import { localTestModelConfig, streamFakeModel } from "@/lib/server/fake-model";
import { chatHandler, run } from "@/lib/server/handlers";
import { readConfig } from "@/lib/server/services";
import { createSearxngSearch } from "@/lib/server/web-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  const config = readConfig();
  const deps = config.localIdentity
    ? { provider: streamFakeModel, modelConfig: localTestModelConfig, maxOutputTokens: 512 }
    : anthropicConfigured()
      ? { provider: streamAnthropic, modelConfig: anthropicModelConfig, maxOutputTokens: MAX_OUTPUT_TOKENS }
      : { provider: streamBedrock, modelConfig, maxOutputTokens: MAX_OUTPUT_TOKENS };
  const searchWeb = config.searxngUrl
    ? (query: string, signal: AbortSignal) => createSearxngSearch(config.searxngUrl!)(query, signal)
    : undefined;
  return run(request, chatHandler({ ...deps, searchWeb }));
}
