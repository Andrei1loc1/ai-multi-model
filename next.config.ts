import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["sharp", "pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
