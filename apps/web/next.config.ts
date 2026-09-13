import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the local workspace package in Next's compilation pipeline during development.
  transpilePackages: ["@clamly/anchor"]
};

export default nextConfig;
