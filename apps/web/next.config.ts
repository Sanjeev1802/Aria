import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@aria/auth",
    "@aria/config",
    "@aria/types",
    "@aria/ui",
    "@aria/utils",
  ],
};

export default nextConfig;
