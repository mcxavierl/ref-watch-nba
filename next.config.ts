import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  staticPageGenerationTimeout: 180,
  async redirects() {
    return [
      {
        source: "/raptors",
        destination: "/teams/TOR",
        permanent: true,
      },
      {
        source: "/lakers",
        destination: "/teams/LAL",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
