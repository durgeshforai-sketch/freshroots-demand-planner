import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page shows live planning data, so pages render per request (force-dynamic)
  // instead of using Cache Components / partial prerendering.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
