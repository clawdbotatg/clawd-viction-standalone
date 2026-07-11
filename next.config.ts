import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // wagmi's connectors pull in optional deps (react-native storage, pino-pretty,
  // walletconnect extras) that don't exist in a web build — stub them out.
  webpack: config => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      "@react-native-async-storage/async-storage": false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  async redirects() {
    return [
      { source: "/skill", destination: "/skill.md", permanent: true },
      { source: "/.well-known/skill.md", destination: "/skill.md", permanent: true },
    ];
  },
};

export default nextConfig;
