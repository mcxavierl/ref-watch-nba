export type GlossaryId =
  | "ats"
  | "ats-split"
  | "home-team-wl"
  | "over-under"
  | "ou-bucket"
  | "spread-split"
  | "home-fav"
  | "home-dog"
  | "whistle-premium"
  | "line-gap"
  | "foul-edge"
  | "grudge-match"
  | "home-bias"
  | "crew-reunion"
  | "closing-line"
  | "over-225"
  | "over-6"
  | "pim"
  | "goals-total"
  | "nhl-whistle-premium"
  | "pp-premium"
  | "ot-rate"
  | "ot-rate-badge"
  | "minors-per-game"
  | "penalty-balance"
  | "nhl-ref-analytics"
  | "home-margin"
  | "pace-alert"
  | "hit-rate"
  | "provenance-estimated"
  | "sample-gate";

export interface GlossaryEntry {
  /** Visible label when none passed as children. */
  label: string;
  /** Plain-language definition. */
  text: string;
}

export const GLOSSARY: Record<GlossaryId, GlossaryEntry> = {
  ats: {
    label: "ATS",
    text: "Against the spread — whether the home team beat the sportsbook point spread (not just who won). A home line of −5.5 means the home team must win by 6+ to cover.",
  },
  "ats-split": {
    label: "ATS split",
    text: "The same ATS record broken into groups — by spread size and by whether the home team was the favorite or underdog.",
  },
  "home-team-wl": {
    label: "Home team W/L",
    text: "Straight-up wins and losses for the home team in games this ref worked — who won, ignoring the spread.",
  },
  "over-under": {
    label: "Over / under",
    text: "Did both teams’ combined score finish above (over) or below (under) the closing total set by sportsbooks before tip-off?",
  },
  "ou-bucket": {
    label: "Line range",
    text: "Games grouped by what the closing total was (e.g. 220–229.5). Shows how often the actual score went over that line in each bucket.",
  },
  "spread-split": {
    label: "Spread split",
    text: "Home team ATS record grouped by how large the spread was (0–4.5, 5–9.5, 10+ points).",
  },
  "home-fav": {
    label: "Home fav",
    text: "When the home team was the favorite (negative spread), how often did they cover ATS?",
  },
  "home-dog": {
    label: "Home dog",
    text: "When the home team was the underdog (positive spread), how often did they cover ATS?",
  },
  "whistle-premium": {
    label: "Points above average",
    text: "How many points above or below league average this crew’s games tend to score — a pace signal, not a betting pick.",
  },
  "line-gap": {
    label: "Total vs benchmark",
    text: "This crew’s historical average total minus tonight’s benchmark (sportsbook total or league average). Positive means they’ve tended to run hotter than the line.",
  },
  "foul-edge": {
    label: "Foul edge",
    text: "Average fouls on one team minus the opponent per game. Positive means that team is whistled less (or the opponent more).",
  },
  "grudge-match": {
    label: "Grudge match",
    text: "An auto-flag when a ref on tonight’s crew has an unusual history with one of the teams playing — win rate, fouls, or a prior result with this exact crew.",
  },
  "home-bias": {
    label: "Home / road bias",
    text: "Whether this crew’s games skew toward home or away teams winning — a win-rate pattern, not ATS.",
  },
  "crew-reunion": {
    label: "Crew reunion",
    text: "The same three officials worked this team before. We surface their prior record and scoring in those games.",
  },
  "closing-line": {
    label: "Closing line",
    text: "The spread and total sportsbooks posted near tip-off. ATS and O/U tables here use that number, not our fixed 225 benchmark.",
  },
  "over-225": {
    label: "Historical over rate",
    text: "Share of this crew’s games where combined scoring beat the benchmark (225 when no sportsbook total is available).",
  },
  "over-6": {
    label: "Historical over rate",
    text: "Share of this crew’s games where combined goals beat the benchmark (6.0 when no sportsbook total is available).",
  },
  pim: {
    label: "PIM",
    text: "Penalty minutes — total infraction time assessed to all skaters in a game. Higher PIM usually means more whistles and stoppages.",
  },
  "goals-total": {
    label: "Goals total",
    text: "Combined goals scored by both teams. NHL games typically land around 6–7 total goals.",
  },
  "nhl-whistle-premium": {
    label: "Goals above average",
    text: "How many goals above or below league average this crew’s games tend to score — a pace signal for totals, not a betting pick.",
  },
  "pp-premium": {
    label: "PP Premium",
    text: "Pre-game index: referee minor-penalty rate × both teams’ power-play strength minus penalty-kill strength. High values flag special-teams volatility — often a totals Over angle, not a pick by itself.",
  },
  "ot-rate": {
    label: "OT rate",
    text: "Share of this referee’s games that reached overtime or a shootout. League average is roughly 23%.",
  },
  "ot-rate-badge": {
    label: "High OT rate",
    text: "This referee pair’s OT rate is above league average on a tight puck line (±1.5). Useful context for OT/SO props when the book offers them — sample-gated.",
  },
  "minors-per-game": {
    label: "Minors per game",
    text: "Average two-minute minor penalties assessed in this referee’s games (both teams combined). More accurate than raw PIM for whistle tightness.",
  },
  "penalty-balance": {
    label: "Penalty balance",
    text: "How evenly minors are split between teams. A “balancer” ref often finishes within one minor of even; descriptive only — not a live makeup-call predictor.",
  },
  "nhl-ref-analytics": {
    label: "Whistle analytics",
    text: "Referee-only metrics from game logs: minors, OT rate, and penalty-balance tendency. Linesmen are excluded.",
  },
  "home-margin": {
    label: "Home avg margin",
    text: "Average home score minus away score in this ref’s games — positive means home teams outscored visitors on average.",
  },
  "pace-alert": {
    label: "Pace alert",
    text: "Fires when a crew’s historical scoring premium and gap vs tonight’s line both look unusually high or low, with enough sample size.",
  },
  "hit-rate": {
    label: "Hit rate",
    text: "Win percentage for that record (wins ÷ all decisions, including pushes where listed).",
  },
  "provenance-estimated": {
    label: "Estimated",
    text: "This number is not computed from real game logs yet — it uses a fallback constant (e.g. league baseline or odds benchmark) until enough live data is ingested.",
  },
  "sample-gate": {
    label: "Sample gate",
    text: "Minimum games required before we show a confident stat. Below the threshold, the value may still appear but is marked as below gate.",
  },
};
