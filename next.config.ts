import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const openuiDevtoolsStub = path.join(rootDir, "lib/openui-devtools-stub.tsx");

const config: NextConfig = {
  output: "standalone",
  trailingSlash: true,
  poweredByHeader: false,
  turbopack: {
    resolveAlias: {
      "@openuidev/devtools": openuiDevtoolsStub,
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
