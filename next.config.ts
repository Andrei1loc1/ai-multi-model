import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: [
    "@napi-rs/canvas",
    "sharp",
    "pdf-parse",
    "pdfjs-dist",
    "unpdf",
    "markitdown-ts",
  ],
};

export default nextConfig;
