import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const openuiDevtoolsStub = path.join(rootDir, "lib/openui-devtools-stub.tsx");
/** Turbopack cannot resolve Windows absolute paths in resolveAlias. */
const openuiDevtoolsStubForTurbopack = "./lib/openui-devtools-stub.tsx";

const config: NextConfig = {
  output: "standalone",
  trailingSlash: true,
  poweredByHeader: false,
  // Do not ship original TS/TSX to the browser in production.
  productionBrowserSourceMaps: false,
  // Hide the Next.js Dev Tools indicator. Compile errors still surface.
  devIndicators: false,
  turbopack: {
    resolveAlias: {
      "@openuidev/devtools": openuiDevtoolsStubForTurbopack,
    },
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      "@openuidev/devtools": openuiDevtoolsStub,
    };
    return webpackConfig;
  },
};

export default config;
