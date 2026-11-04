import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
