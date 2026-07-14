import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  staticPageGenerationTimeout: 300,
  cleanDistDir: process.env.KEEP_NEXT_DIST === "1" ? false : true,
  eslint: { ignoreDuringBuilds: true },
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
    webpackMemoryOptimizations: true,
    cpus: 1,
  },
  async redirects() {
    return [
      {
        source: "/insights",
        destination: "/rankings",
        permanent: false,
      },
      {
        source: "/nhl/insights",
        destination: "/nhl/rankings",
        permanent: false,
      },
      {
        source: "/nfl/insights",
        destination: "/nfl/rankings",
        permanent: false,
      },
      {
        source: "/epl/insights",
        destination: "/epl/rankings",
        permanent: false,
      },
      {
        source: "/laliga/insights",
        destination: "/laliga/rankings",
        permanent: false,
      },
      {
        source: "/cbb/insights",
        destination: "/cbb/rankings",
        permanent: false,
      },
      {
        source: "/cfb/insights",
        destination: "/cfb/rankings",
        permanent: false,
      },
      {
        source: "/crews",
        destination: "/refs",
        permanent: false,
      },
      {
        source: "/nhl/crews",
        destination: "/nhl/refs",
        permanent: false,
      },
      {
        source: "/nfl/crews",
        destination: "/nfl/refs",
        permanent: false,
      },
      {
        source: "/epl/crews",
        destination: "/epl/refs",
        permanent: false,
      },
      {
        source: "/laliga/crews",
        destination: "/laliga/refs",
        permanent: false,
      },
      {
        source: "/cbb/crews",
        destination: "/cbb/refs",
        permanent: false,
      },
      {
        source: "/cfb/crews",
        destination: "/cfb/refs",
        permanent: false,
      },
      {
        source: "/nba/compare",
        destination: "/compare",
        permanent: false,
      },
      {
        source: "/nhl/compare",
        destination: "/compare",
        permanent: false,
      },
      {
        source: "/nfl/compare",
        destination: "/compare",
        permanent: false,
      },
      {
        source: "/epl/compare",
        destination: "/compare",
        permanent: false,
      },
      {
        source: "/laliga/compare",
        destination: "/compare",
        permanent: false,
      },
      {
        source: "/cbb/compare",
        destination: "/compare",
        permanent: false,
      },
      {
        source: "/cfb/compare",
        destination: "/compare",
        permanent: false,
      },
      {
        source: "/wnba",
        destination: "/",
        permanent: false,
      },
      {
        source: "/wnba/:path*",
        destination: "/",
        permanent: false,
      },
      {
        source: "/mlb",
        destination: "/",
        permanent: false,
      },
      {
        source: "/mlb/:path*",
        destination: "/",
        permanent: false,
      },
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
