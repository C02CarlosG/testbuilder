import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Panel con datos por usuario: se usa el modelo dinámico clásico (sin Cache Components).
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
