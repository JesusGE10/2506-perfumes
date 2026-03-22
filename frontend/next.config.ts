import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      // Cloudflare R2 public bucket
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.cloudflarestorage.com" },
      // Local development
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // Proxy API calls in dev so we don't hit CORS issues
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/:path*`,
      },
    ];
  },
};

export default nextConfig;

