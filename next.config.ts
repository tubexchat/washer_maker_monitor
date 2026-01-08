import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed 'output: export' to enable API routes
  // This project will use Cloudflare Pages with Next.js runtime
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
