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
  | "nfl-ref-analytics"
  | "nfl-whistle-premium"
  | "game-state-index"
  | "home-margin"
  | "pace-alert"
  | "hit-rate"
  | "provenance-estimated"
  | "sample-gate"
  | "close-game-proxy"
  | "profile-signals"
  | "gsni";

export interface GlossaryEntry {
  /** Visible label when none passed as children. */
  label: string;
  /** Plain-language definition. */
  text: string;
}

export const GLOSSARY: Record<GlossaryId, GlossaryEntry> = {
  ats: {
    label: "ATS",
    text: "Against the spread: whether the home team beat the sportsbook point spread (not just who won). A home line of −5.5 means the home team must win by 6+ to cover.",
  },
  "ats-split": {
    label: "ATS split",
    text: "The same ATS record broken into groups, by spread size and by whether the home team was the favorite or underdog.",
  },
  "home-team-wl": {
    label: "Home team W/L",
    text: "Straight-up wins and losses for the home team in games this ref worked; who won, ignoring the spread.",
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
    text: "How many points above or below league average this crew’s games tend to score, a pace signal, not a betting pick.",
  },
  "line-gap": {
    label: "Total vs benchmark",
    text: "This crew’s historical average total minus tonight’s benchmark (sportsbook total or league average). Positive means they’ve tended to run hotter than the line.",
  },
  "foul-edge": {
    label: "Foul edge",
    text: "Opponent whistle volume minus team volume per game. Positive means your team is whistled less (or the opponent more), a favorable minors/flags edge.",
  },
  "grudge-match": {
    label: "Crew history spotlight",
    text: "When a ref on tonight's crew has an unusual historical pattern with one of the teams: win rate, fouls, or a prior result with this exact crew.",
  },
  "home-bias": {
    label: "Home / road venue split",
    text: "Whether this crew's games skew toward home or away teams winning. A descriptive win-rate pattern, not ATS edge.",
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
    text: "Penalty minutes: total infraction time assessed to all skaters in a game. Higher PIM usually means more whistles and stoppages.",
  },
  "goals-total": {
    label: "Goals total",
    text: "Combined goals scored by both teams. NHL games typically land around 6–7 total goals.",
  },
  "nhl-whistle-premium": {
    label: "Goals above average",
    text: "How many goals above or below league average this crew’s games tend to score, a pace signal for totals, not a betting pick.",
  },
  "pp-premium": {
    label: "PP Premium",
    text: "Pre-game index: referee minor-penalty rate × both teams’ power-play strength minus penalty-kill strength. High values flag special-teams volatility; often a totals Over angle, not a pick by itself.",
  },
  "ot-rate": {
    label: "OT rate",
    text: "Share of this referee’s games that reached overtime or a shootout. League average is roughly 23%.",
  },
  "ot-rate-badge": {
    label: "High OT rate",
    text: "This referee pair’s OT rate is above league average on a tight puck line (±1.5). Useful context for OT/SO props when the book offers them; requires minimum game count.",
  },
  "minors-per-game": {
    label: "Minors per game",
    text: "Average two-minute minor penalties assessed in this referee’s games (both teams combined). More accurate than raw PIM for whistle tightness.",
  },
  "penalty-balance": {
    label: "Penalty balance",
    text: "How evenly minors are split between teams. A “balancer” ref often finishes within one minor of even; descriptive only, not a live makeup-call predictor.",
  },
  "nhl-ref-analytics": {
    label: "Whistle analytics",
    text: "Referee-only metrics from game logs: minors, OT rate, and penalty-balance tendency. Linesmen are excluded.",
  },
  "nfl-ref-analytics": {
    label: "Whistle analytics",
    text: "Referee-only NFL metrics from game logs: flags per game, penalty yards, and flag-balance tendency.",
  },
  "nfl-whistle-premium": {
    label: "Whistle premium",
    text: "Crew combined scoring pace vs league baseline, plus flag-rate context for tonight's matchup. Descriptive historical signal only.",
  },
  "game-state-index": {
    label: "Game-State Index",
    text: "Clutch whistle tendency vs the league in matched score-and-clock situations. Labeled Quiet when flags run below league average in those spots, Heavy when above, Neutral when near average. The index uses 50 as league average: higher is quieter, lower is heavier (0 = heaviest, 100 = quietest). NFL officials need 25+ high-leverage minutes before this appears on profiles.",
  },
  "home-margin": {
    label: "Home avg margin",
    text: "Average home score minus away score in this ref’s games; positive means home teams outscored visitors on average.",
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
    text: "This number is not computed from real game logs yet; it uses a fallback constant (e.g. league baseline or odds benchmark) until we have enough real game data.",
  },
  "sample-gate": {
    label: "Sample gate",
    text: "Minimum games required before we show a confident stat. Below the threshold, the value may still appear but is marked as below gate.",
  },
  "close-game-proxy": {
    label: "Close-game proxy",
    text: "Competitive late-game windows derived from final margins, pregame spreads, or overtime in official box scores. Compares window averages to full-game season averages.",
  },
  "profile-signals": {
    label: "Profile signals",
    text: "Research-style patterns on a ref profile: scoring delta, whistle rate vs baseline, over frequency, and home/road splits when available. Informational only; always shows sample size and data provenance.",
  },
  gsni: {
    label: "Game-State Neutralization (GSNI)",
    text: "NFL-only clutch whistle metric. We group plays by score gap and clock, weight close late-game minutes higher, and compare this official's flag rate to the league in those same buckets. The result is labeled Quiet (fewer flags than league), Heavy (more flags), or Neutral. The index runs 0 to 100 where 50 is league average: higher is quieter, lower is heavier. Requires 50+ high-leverage minutes before we publish a score.",
  },
};
