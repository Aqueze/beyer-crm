import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "sw.js",
  scope: "/",
  maximumFileSizeToCacheInBytes: 1.5 * 1024 * 1024,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default withSerwist(nextConfig);
