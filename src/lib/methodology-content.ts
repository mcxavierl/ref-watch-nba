import {
  BAYESIAN_PRIOR_STRENGTH,
  DELTA_HONESTY_FOOTNOTE,
  MATURITY_TARGET_GAMES,
  RELIABILITY_FLOOR_GAMES,
} from "@/lib/data-maturity";
import { CREW_DOMINANCE_MIN_GAMES } from "@/lib/crew-dominance";
import {
  FOUL_RATE_VARIANCE_PCT,
  MIN_MATRIX_GAMES,
  MIN_WHISTLE_REF_GAMES,
  WIN_RATE_OUTLIER_PP,
} from "@/lib/insights/generator-core";
import {
  MATRIX_EXTREME_DELTA_PTS,
  MATRIX_MIN_GAMES,
} from "@/lib/ref-team-matrix";
import { NHL_LINESMAN_METHODOLOGY_NOTE, TRUST_CHARTER_PRINCIPLES } from "@/lib/trust-charter";

export type MethodologySection = {
  id: string;
  title: string;
  lead?: string;
  bullets: string[];
};

export const METHODOLOGY_PAGE_LEAD =
  "How Ref Watch builds verified officiating intelligence: sample gates, metric definitions, confidence labels, and the limits of historical data. Descriptive tendencies only, not predictions or betting advice.";

export const METHODOLOGY_SECTIONS: MethodologySection[] = [
  {
    id: "principles",
    title: "Core principles",
    lead: "Every surface on Ref Watch follows the same trust charter.",
    bullets: [...TRUST_CHARTER_PRINCIPLES],
  },
  {
    id: "sample-gates",
    title: "Sample gates",
    lead: "Officials and splits must clear minimum game counts before they surface in rankings, matrices, or insight cards.",
    bullets: [
      `Ref profiles and rankings default to officials with ${MIN_WHISTLE_REF_GAMES}+ games in the current dataset window. Below-gate refs stay hidden or muted.`,
      `Ref×team matrix cells require ${MATRIX_MIN_GAMES}+ shared games. Standout splits highlight cells at least ±${MATRIX_EXTREME_DELTA_PTS} percentage points from the team baseline, with thicker samples breaking ties.`,
      `Crew dominance and pairing notes need ${CREW_DOMINANCE_MIN_GAMES}+ shared games. Whistle drift scans use a 12+ game floor.`,
      `ATS and O/U splits need 30+ decisive games with closing lines before they appear in betting-adjacent views.`,
      `Insight cards below ${RELIABILITY_FLOOR_GAMES} shared games show a shrunk win-rate delta (empirical Bayes with a ${BAYESIAN_PRIOR_STRENGTH}-game prior). ${DELTA_HONESTY_FOOTNOTE}`,
      `Data maturity bars reach 100% at ${MATURITY_TARGET_GAMES} games for ref×team splits.`,
    ],
  },
  {
    id: "metrics",
    title: "What we measure",
    bullets: [
      "Foul edge: average team whistle volume (fouls, flags, minors, cards) in games a ref worked. Crew-level correlation, not fouls charged to that official alone.",
      "Whistle premium: crew average combined score minus league baseline for that sport.",
      "Ref×team win rate: straight-up record for a team with a specific official, compared to the team's sample baseline across all crews.",
      "Over rate and line benchmarks: share of games finishing above a closing total or league-average proxy when lines are missing.",
      "Home and road bias: win-rate and whistle splits by venue, separate from ATS cover rates.",
      NHL_LINESMAN_METHODOLOGY_NOTE,
    ],
  },
  {
    id: "confidence",
    title: "Confidence tiers",
    lead: "Findings and insight cards carry Strong, Moderate, or Thin labels based on sample depth and effect size.",
    bullets: [
      `Whistle outliers need ${FOUL_RATE_VARIANCE_PCT}%+ variance vs league average with ${MIN_WHISTLE_REF_GAMES}+ games.`,
      `Matrix and win-rate highlights need at least ${WIN_RATE_OUTLIER_PP} percentage points of separation from baseline.`,
      `Strong tier: large effect with a deep sample. Moderate: meaningful but thinner. Thin: directional only and never promoted to featured slots.`,
      "Provenance markers flag estimated or partial samples when closing lines or crew data are incomplete.",
    ],
  },
  {
    id: "data",
    title: "Data and provenance",
    bullets: [
      "Live leagues (NBA, NHL, NFL, EPL, La Liga, NCAA men's basketball) pull from historical game logs, ref-stats sidecars, and crew assignment feeds where available.",
      "Season windows vary by league ingest depth. Overview totals and league cards reflect the latest bundled snapshot at build time.",
      "When closing totals or spreads are unavailable, league-average benchmarks from game logs act as over-rate proxies.",
      "NCAA hubs stay gated until conference coverage and integrity audits pass release thresholds.",
      "Historical line data is unavailable for some games. Benchmarks and provenance labels apply wherever noted on the card or profile.",
    ],
  },
  {
    id: "findings",
    title: "Findings and ranking",
    bullets: [
      "Dataset findings rank by effect size multiplied by the square root of sample size, then weighted by sample depth within confidence tiers.",
      "Category deduplication keeps insight hubs diverse so one metric type does not dominate the feed.",
      "Language stays descriptive: historical tendency, over rate, foul edge. Never picks, locks, or guaranteed edges.",
      "Browse ranked cards on each league insights hub or the cross-league overview editorial sections.",
    ],
  },
  {
    id: "limits",
    title: "Limits",
    bullets: [
      "Patterns from past games do not predict future results. Assignments, rule emphasis, and roster context change.",
      "Ref Watch is independent research. We are not affiliated with leagues, unions, or sportsbooks.",
      "Nothing on this site is betting advice. Use the data to understand crew history, not to place wagers.",
    ],
  },
];

export const METHODOLOGY_QUICK_LINKS = [
  { label: "Insights hub", href: "/insights" },
  { label: "NBA matrix", href: "/matrix" },
  { label: "NHL insights", href: "/nhl/insights" },
  { label: "NFL matrix", href: "/nfl/matrix" },
  { label: "EPL insights", href: "/epl/insights" },
  { label: "Compare officials", href: "/compare" },
] as const;
