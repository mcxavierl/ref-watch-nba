import { getRefStats } from "@/lib/data";
import { getRefStats as getNhlRefStats } from "@/lib/nhl/data";

export type PartnersKpi = {
  value: string;
  label: string;
  hint?: string;
};

export function getPartnersKpis(): PartnersKpi[] {
  const nba = getRefStats();
  const nhl = getNhlRefStats();
  const games =
    (nba.meta.totalGamesProcessed ?? 0) + (nhl.meta.totalGamesProcessed ?? 0);
  const officials = nba.refs.length + nhl.refs.length;
  const seasons = Math.max(nba.meta.seasons.length, nhl.meta.seasons.length);

  return [
    {
      value: games.toLocaleString(),
      label: "Games analyzed",
      hint: "NBA + NHL historical sample",
    },
    {
      value: String(officials),
      label: "Officials profiled",
      hint: "Crew-level scoring & whistle splits",
    },
    {
      value: "62",
      label: "Teams covered",
      hint: "30 NBA · 32 NHL franchises",
    },
    {
      value: "2",
      label: "Leagues",
      hint: "Unified slate & syndication",
    },
    {
      value: String(seasons),
      label: "Seasons of data",
      hint: "Sample-gated research layer",
    },
    {
      value: "12+",
      label: "Signal types",
      hint: "Pace, whistle, O/U, matrix, crew",
    },
    {
      value: "100%",
      label: "Official assignments",
      hint: "League-published crew feeds",
    },
    {
      value: "<2 min",
      label: "Time to slate signal",
      hint: "Nightly crew cards & tendency tags",
    },
  ];
}

export const PARTNERS_NARRATIVE = {
  problem:
    "Media and analytics partners surface generic game previews. Referee crew context, a core pre-game intelligence layer in NBA and NHL, stays fragmented across league sites and static spreadsheets.",
  solution:
    "Ref Watch unifies nightly assignments with multi-season crew analytics, ranks standout splits, and packages them for syndicated feeds, broadcast overlays, and partner integrations.",
  comparison: {
    traditional: [
      "Manual assignment checks",
      "No historical crew context",
      "Generic preview copy",
      "Missed officiating-environment signals",
    ],
    refWatch: [
      "Automated slate ingestion",
      "Crew reunion & outlier signals",
      "Partner-ready widget payloads",
      "Signal-aligned editorial modules",
    ],
  },
  capabilities: [
    "NBA + NHL coverage",
    "Official assignment feeds",
    "Sample-gated analytics",
    "Syndicated JSON/RSS",
    "Privacy-first (no PII)",
    "Free public research layer",
  ],
  enterpriseUses: [
    {
      title: "Media & broadcast",
      outcome: "Pre-game crew storylines and standout split overlays.",
    },
    {
      title: "Data & research partners",
      outcome: "Syndicated feeds and API-ready nightly slate signals.",
    },
    {
      title: "League-adjacent products",
      outcome: "Whistle-pace and scoring environment benchmarks by crew.",
    },
    {
      title: "Licensed integrations",
      outcome: "Private partner modules for transactional or betting-adjacent use cases, documented separately.",
    },
  ],
} as const;
