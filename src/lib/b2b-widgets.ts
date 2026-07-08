export type SportsbookPartner = {
  id: string;
  name: string;
  accent: string;
};

export type AffiliateOutlierSignal = {
  /** e.g. "+10.5 PIM" */
  deltaLabel: string;
  /** Plain-language context for the outlier */
  context: string;
  /** Short category label */
  category: string;
};

export type AffiliatePropOffer = {
  market: string;
  line: number;
  direction: "over" | "under";
  americanOdds: string;
  impliedEdge?: string;
};

export type AffiliateSlateMatch = {
  id: string;
  awayTeam: string;
  homeTeam: string;
  sport: "nba" | "nhl";
  gameTotal: number;
  crewChief: {
    name: string;
    slug: string;
    role: string;
  };
  outlier: AffiliateOutlierSignal;
  partner: SportsbookPartner;
  offer: AffiliatePropOffer;
  signalActive: boolean;
  signalSummary: string;
};

export type WhistlePattern = "high-volume" | "baseline" | "swallows";

export type LiveGameSnapshot = {
  id: string;
  awayTeam: string;
  homeTeam: string;
  sport: "nba" | "nhl";
  period: string;
  clock: string;
  scoreAway: number;
  scoreHome: number;
  crew: string[];
  pattern: WhistlePattern;
  confidence: number;
  headline: string;
  body: string;
  leverageContext: string;
};

export const DEMO_SPORTSBOOK: SportsbookPartner = {
  id: "bet365",
  name: "bet365",
  accent: "#027b5b",
};

export const DEMO_AFFILIATE_MATCHES: AffiliateSlateMatch[] = [
  {
    id: "nhl-demo-1",
    awayTeam: "TOR",
    homeTeam: "BOS",
    sport: "nhl",
    gameTotal: 5.5,
    crewChief: {
      name: "Kelly Sutherland",
      slug: "kelly-sutherland-11",
      role: "Crew Chief",
    },
    outlier: {
      deltaLabel: "+10.5 PIM",
      context: "in low-total games (≤ 5.5 combined goals)",
      category: "Whistle volume outlier",
    },
    partner: DEMO_SPORTSBOOK,
    offer: {
      market: "Alt. Total Penalties",
      line: 6.5,
      direction: "over",
      americanOdds: "+110",
      impliedEdge: "+2.1σ vs closing band",
    },
    signalActive: true,
    signalSummary:
      "Ref signal aligns with alt penalty total — crew historically runs heavy in sub-6.0 goal environments.",
  },
  {
    id: "nba-demo-1",
    awayTeam: "LAL",
    homeTeam: "BOS",
    sport: "nba",
    gameTotal: 224.5,
    crewChief: {
      name: "Scott Foster",
      slug: "scott-foster-48",
      role: "Crew Chief",
    },
    outlier: {
      deltaLabel: "+4.2 PTS",
      context: "above league baseline in crew reunion games",
      category: "Scoring bump",
    },
    partner: DEMO_SPORTSBOOK,
    offer: {
      market: "Alt. Team Total",
      line: 112.5,
      direction: "over",
      americanOdds: "-105",
      impliedEdge: "+1.8σ pace delta",
    },
    signalActive: true,
    signalSummary:
      "Pace signal supports alt over — reunion crew clears adjusted benchmark in 68% of sample.",
  },
];

export const DEMO_LIVE_GAMES: LiveGameSnapshot[] = [
  {
    id: "live-nhl-1",
    awayTeam: "EDM",
    homeTeam: "VGK",
    sport: "nhl",
    period: "4th Period",
    clock: "12:41",
    scoreAway: 2,
    scoreHome: 2,
    crew: ["Kelly Sutherland", "Dan O'Halloran", "Brian Pochmara"],
    pattern: "swallows",
    confidence: 91,
    leverageContext: "High-leverage · tied · late 3rd OT",
    headline: "Leverage Signal Active",
    body: "Kelly Sutherland / Dan O'Halloran / Brian Pochmara historical data suggests a heavy whistle swallow pattern in late-game situations. Live betting Under detect bias.",
  },
  {
    id: "live-nba-1",
    awayTeam: "NYK",
    homeTeam: "MIA",
    sport: "nba",
    period: "4th Quarter",
    clock: "3:18",
    scoreAway: 98,
    scoreHome: 101,
    crew: ["Tony Brothers", "Josh Tiven", "Ben Taylor"],
    pattern: "high-volume",
    confidence: 84,
    leverageContext: "High-leverage · 1-possession margin",
    headline: "Whistle Volume Alert",
    body: "Tony Brothers crews average +3.8 fouls above baseline in clutch segments (≤ 4:00, ≤ 5 pt). Live foul props trending over.",
  },
  {
    id: "live-nhl-2",
    awayTeam: "COL",
    homeTeam: "DAL",
    sport: "nhl",
    period: "2nd Period",
    clock: "8:02",
    scoreAway: 1,
    scoreHome: 0,
    crew: ["Francis Charron", "Steve Kozari", "Michel Cormier"],
    pattern: "baseline",
    confidence: 62,
    leverageContext: "Early mid-game · neutral leverage",
    headline: "Baseline Whistle Pace",
    body: "Crew within ±0.4 PIM of league baseline through 40+ min samples. No live directional edge detected yet.",
  },
];

export function whistlePatternMeta(pattern: WhistlePattern): {
  label: string;
  short: string;
  tone: "high-volume" | "baseline" | "swallows";
} {
  switch (pattern) {
    case "high-volume":
      return { label: "High-Volume Whistle", short: "Heavy", tone: "high-volume" };
    case "swallows":
      return { label: "Swallows Whistle", short: "Swallow", tone: "swallows" };
    default:
      return { label: "Baseline", short: "Neutral", tone: "baseline" };
  }
}
