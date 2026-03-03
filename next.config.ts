import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /apps\/mobile/,
    };
    return config;
  },
};

export default nextConfig;
