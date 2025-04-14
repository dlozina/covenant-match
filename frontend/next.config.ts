import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_TESTER_MODE: "true",
    NEXT_PUBLIC_TESTER_PASSWORD: process.env.NEXT_PUBLIC_TESTER_PASSWORD || "test-covenant-45#",
  },
};

export default nextConfig;
