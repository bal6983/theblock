import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "theblockchain.gr",
      },
    ],
  },
};

export default nextConfig;
