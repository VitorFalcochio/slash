import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O app roda dentro do Electron: o build gera HTML/JS estático em `out/`,
  // servido pelo protocolo `app://` (ver electron/main.cjs).
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
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
