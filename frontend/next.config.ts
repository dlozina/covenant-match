import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_TESTER_MODE: "true",
    NEXT_PUBLIC_TESTER_PASSWORD: process.env.NEXT_PUBLIC_TESTER_PASSWORD || "test-covenant-45#",
  },
  images: {
    domains: ['localhost', 'covenant-match.com', '127.0.0.1'],
  },
};

export default nextConfig;
