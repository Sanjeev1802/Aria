import type { NextConfig } from "next";

const frameAncestors =
  process.env.ARIA_FRAME_ANCESTORS?.trim() ||
  "'self' http://localhost:3000 http://localhost:3001 http://127.0.0.1:3000 http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
