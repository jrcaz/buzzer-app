import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone build for Docker deployment
  output: "standalone",

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Enable strict mode for better React practices
  reactStrictMode: true,
};

export default nextConfig;
