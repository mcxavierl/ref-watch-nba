import type { NextConfig } from "next";
import { unifiedIALegacyRedirects } from "./src/lib/unified-ia-redirects";

const nextConfig: NextConfig = {
  output: "standalone",
  staticPageGenerationTimeout: 300,
  cleanDistDir: process.env.KEEP_NEXT_DIST === "1" ? false : true,
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.nba.com", pathname: "/**" },
      { protocol: "https", hostname: "assets.nhle.com", pathname: "/**" },
    ],
  },
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
      "./data/worldcup/final-2026.json",
      "./data/cbb/ref-stats-core.json",
      "./data/cbb/team-splits.json",
      "./data/cbb/game-logs.json",
      "./data/wnba/ref-stats-core.json",
      "./data/wnba/team-splits.json",
      "./data/wnba/assignments.json",
    ],
  },
  experimental: {
    webpackBuildWorker: false,
    webpackMemoryOptimizations: true,
    cpus: 1,
  },
  async redirects() {
    const legacy = unifiedIALegacyRedirects().map((entry) => ({
      source: entry.source,
      destination: entry.destination,
      permanent: entry.permanent,
    }));
    return [
      ...legacy,
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
        destination: "/nhl/research/tendencies",
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
      // Legacy NBA data paths (pre-league-prefix layout); static copies also ship in public/data/
      { source: "/data/ref-stats.json", destination: "/data/nba/ref-stats.json" },
      { source: "/data/team-splits.json", destination: "/data/nba/team-splits.json" },
      { source: "/data/game-logs.json", destination: "/data/nba/game-logs.json" },
    ];
  },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
}
