import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep dev's generated chunks separate from the production build output.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
