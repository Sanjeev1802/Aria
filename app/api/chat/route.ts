import { modelConfig, streamBedrock, MAX_OUTPUT_TOKENS } from "@/lib/server/bedrock";
import { localTestModelConfig, streamFakeModel } from "@/lib/server/fake-model";
import { chatHandler, run } from "@/lib/server/handlers";
import { readConfig } from "@/lib/server/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  const config = readConfig();
  const deps = config.localIdentity
    ? { provider: streamFakeModel, modelConfig: localTestModelConfig, maxOutputTokens: 512 }
    : { provider: streamBedrock, modelConfig, maxOutputTokens: MAX_OUTPUT_TOKENS };
  return run(request, chatHandler(deps));
}
