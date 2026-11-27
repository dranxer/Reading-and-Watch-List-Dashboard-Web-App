import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lint is style-only here (no-explicit-any etc.) — run `npm run lint` separately.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
