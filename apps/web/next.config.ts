import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Next.js checks for security releases and prompts an upgrade to the patched version
    agentUpgrade: "security",
  },
  // Today is now part of Home
  async redirects() {
    return [{ source: "/today", destination: "/home", permanent: false }];
  },
  turbopack: {
    rules: {
      // Tailwind only processes the global stylesheet. Matching every *.css would also take
      // over CSS modules (*.module.css) and turn them into plain CSS, losing their class names.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
