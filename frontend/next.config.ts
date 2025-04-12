import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_TESTER_MODE: process.env.NEXT_PUBLIC_TESTER_MODE || "false",
    NEXT_PUBLIC_TESTER_PASSWORD: process.env.NEXT_PUBLIC_TESTER_PASSWORD || "covenant-test",
  },
};

export default nextConfig;
