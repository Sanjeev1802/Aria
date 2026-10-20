// Override explicitly with ARIA_HOST when deploying a container.
process.env.HOSTNAME = process.env.ARIA_HOST || "127.0.0.1";
await import("../.next/standalone/server.js");
