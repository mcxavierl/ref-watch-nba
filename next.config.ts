import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  staticPageGenerationTimeout: 180,
  outputFileTracingIncludes: {
    "/**": [
      "./data/baselines.json",
      "./data/ref-stats-core.json",
      "./data/team-splits.json",
      "./data/nhl/ref-stats-core.json",
      "./data/nhl/team-splits.json",
      "./data/nfl/ref-stats-core.json",
      "./data/nfl/team-splits.json",
      "./data/epl/ref-stats-core.json",
      "./data/epl/team-splits.json",
      "./data/laliga/ref-stats-core.json",
      "./data/laliga/team-splits.json",
    ],
  },
  experimental: {
    webpackBuildWorker: false,
    cpus: 1,
  },
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
      {
        source: "/feed/nba.json",
        destination: "/feed/nba/json",
        permanent: true,
      },
      {
        source: "/feed/nhl.json",
        destination: "/feed/nhl/json",
        permanent: true,
      },
      {
        source: "/feed/nba.xml",
        destination: "/feed/nba/rss",
        permanent: true,
      },
      {
        source: "/feed/nhl.xml",
        destination: "/feed/nhl/rss",
        permanent: true,
      },
      {
        source: "/research",
        has: [{ type: "query", key: "league", value: "nhl" }],
        destination: "/nhl/research",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/feed/nba.json", destination: "/feed/nba/json" },
      { source: "/feed/nba.xml", destination: "/feed/nba/rss" },
      { source: "/feed/nhl.json", destination: "/feed/nhl/json" },
      { source: "/feed/nhl.xml", destination: "/feed/nhl/rss" },
    ];
  },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
}
