import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@aria/auth",
    "@aria/ui",
    "@aria/utils",
    "@aria/types",
    "@aria/config",
  ],
};

export default nextConfig;
