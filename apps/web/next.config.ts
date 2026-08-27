import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@markov/engine", "@markov/sdk"],
};

export default nextConfig;
