export type ResearchArticleSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type ResearchArticle = {
  slug: string;
  canonicalPath: string;
  description: string;
  title: string;
  subtitle: string;
  readMinutes: number;
  publishedLabel: string;
  tldr: string[];
  sections: ResearchArticleSection[];
  relatedLinks: { href: string; label: string }[];
};

export const LEVERAGE_SPIKE_ANOMALY_ARTICLE: ResearchArticle = {
  slug: "leverage-spike-anomaly",
  canonicalPath: "/research/leverage-spike-anomaly",
  description:
    "A concise Ref Watch research brief on historical high-leverage penalty frequency: why volume metrics miss pressure-state behavior, and how the Game-State Index and LWIS surface the gap.",
  title: "The Leverage-Spike Anomaly",
  subtitle: "Historical high-leverage penalty frequency when game state matters most",
  readMinutes: 5,
  publishedLabel: "July 2026 · Ref Watch Research",
  tldr: [
    "Raw foul and flag counts treat every minute like every other minute. They miss the clutch stretch where whistle behavior often shifts.",
    "The Leverage-Spike Anomaly surfaces officials whose high-leverage whistle rate diverges from their volume baseline.",
    "Ref Watch reports this through leverage-weighted NFL metrics (Game-State Index and LWIS) with explicit sample gates before anything is published.",
  ],
  sections: [
    {
      id: "blind-spot",
      title: "The blind spot in flag volume",
      paragraphs: [
        "Most officiating dashboards stop at totals: fouls per game, flags per drive, cards per ninety. That is useful for pace, but it collapses a full game into one number.",
        "In practice, crews often behave differently when the score is tight, the clock is short, or win probability swings on a single snap. A ref who looks league-average on volume can still compress or expand the game in those minutes.",
        "That gap between volume and pressure is what we call the Leverage-Spike Anomaly.",
      ],
    },
    {
      id: "leverage",
      title: "What counts as leverage",
      paragraphs: [
        "Leverage is situational context, not narrative. We weight moments using score differential, time remaining, down and distance where available, and win-probability movement when play-level data exists.",
        "A routine first-quarter hold and a one-score, two-minute drill are not the same whistle environment. Treating them equally washes out the elasticity we care about.",
      ],
      bullets: [
        "Late-game, one-possession margins",
        "Third- and fourth-down snaps in scoring range",
        "Win-probability swings above our high-leverage threshold",
        "Overtime and crisis states where a single flag resets tempo",
      ],
    },
    {
      id: "anomaly",
      title: "Defining the anomaly",
      paragraphs: [
        "An official shows a leverage-spike profile when their high-leverage whistle activity materially diverges from what their overall volume would predict.",
        "Some crews go quiet under pressure: fewer subjective flags in clutch states than peers facing the same game script. Others show higher leverage-weighted readings even when per-game totals look ordinary.",
        "Neither pattern is good or bad on its own. The signal is descriptive. It tells you where to look before you trust a simple foul average.",
      ],
    },
    {
      id: "elasticity",
      title: "Pressure readings on Ref Watch",
      paragraphs: [
        "We summarize clutch divergence with two NFL-facing tools already in the product. Both require play-level or state-backed samples before we show a number.",
      ],
      bullets: [
        "Game-State Index: compares leverage-weighted penalty frequency to league peers in matched game states. Reported as an Index Score vs league average; zero is typical frequency. Withheld until 50+ high-leverage minutes.",
        "LWIS (Leverage-Weighted Impact Score): sums |ΔWPA| × leverage weight on subjective whistles. Withheld until 15+ high-leverage subjective events in the trailing window.",
        "High-leverage impact and flag-rate splits on ref profiles when penalty events are ingested from play-by-play.",
      ],
    },
    {
      id: "use-it",
      title: "How to use the signal",
      paragraphs: [
        "Start with volume to understand baseline pace, then review leverage on NFL ref profiles when the sample gate clears. If Game-State Index or LWIS is withheld, the honest answer is still no answer.",
        "Pair the anomaly read with crew and team matrix splits: a leverage spike against a specific opponent is a different story than a league-wide clutch tilt.",
        "This is historical intelligence for scouts, analysts, and broadcast prep. It is not a betting trigger and not a prediction of the next flag.",
      ],
    },
    {
      id: "limits",
      title: "Limits and honesty",
      paragraphs: [
        "Leverage metrics depend on ingest depth. Early-season or partial play-by-play coverage stays muted rather than extrapolated.",
        "Cross-league comparison is not supported: leverage weights and whistle taxonomies differ by sport.",
        "All Ref Watch research aligns with game logs and published sample gates. See Methodology for gates, provenance labels, and confidence tiers.",
      ],
    },
  ],
  relatedLinks: [
    { href: "/methodology", label: "Methodology and sample gates" },
    { href: "/nfl/refs", label: "NFL referee directory" },
    { href: "/nfl/research", label: "NFL research findings" },
  ],
};
