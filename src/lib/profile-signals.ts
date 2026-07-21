import {
  HIGHLIGHT_NHL_MINORS_DELTA_MIN,
  HIGHLIGHT_OVER_RATE_DEVIATION_MIN,
  HIGHLIGHT_SCORING_DELTA_MIN,
  HIGHLIGHT_WHISTLE_DELTA_MIN,
  meetsScoringHighlightThreshold,
  meetsWhistleHighlightThreshold,
} from "@/lib/highlight-badge";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import {
  homeAtsSignalHeadline,
  overTiltInsight,
  scoringPaceInsight,
  whistleInflationHeadline,
} from "@/lib/insight-headlines";
import { formatPctFromWlp } from "@/lib/ref-betting";
import { sampleGateStatus } from "@/lib/provenance";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type {
  RefBettingStats,
  RefProfile,
  RefStatsFile,
  SampleGateStatus,
} from "@/lib/types";

export type ProfileSignalKind =
  | "scoring-delta"
  | "whistle-delta"
  | "over-tilt"
  | "home-road-scoring"
  | "home-ats";

export interface ProfileSignalStat {
  label: string;
  value: string;
  detail?: string;
}

export interface ProfileSignal {
  kind: ProfileSignalKind;
  headline: string;
  body: string;
  stats: ProfileSignalStat[];
  notable: boolean;
}

export interface ProfileSignalsBundle {
  signals: ProfileSignal[];
  notableCount: number;
  sampleGames: number;
  seasons: string[];
  seasonRange: string;
  dataSource: RefStatsFile["meta"]["source"];
  sampleGate: SampleGateStatus;
  overBaseline: number;
}

function scoringThreshold(_leagueId: LeagueId): number {
  return HIGHLIGHT_SCORING_DELTA_MIN;
}

function whistleThreshold(leagueId: LeagueId): number {
  return leagueId === "nhl"
    ? HIGHLIGHT_NHL_MINORS_DELTA_MIN
    : HIGHLIGHT_WHISTLE_DELTA_MIN;
}

function overTiltThreshold(): number {
  return HIGHLIGHT_OVER_RATE_DEVIATION_MIN;
}

function homeRoadThreshold(leagueId: LeagueId): number {
  return leagueId === "nhl" ? 0.4 : 3;
}

function whistleDelta(ref: RefProfile, leagueId: LeagueId): number {
  if (leagueId === "nhl") {
    return ref.nhlAnalytics?.minorsDelta ?? ref.foulsDelta;
  }
  return ref.foulsDelta;
}

function buildScoringSignal(
  ref: RefProfile,
  meta: RefStatsFile["meta"],
  leagueId: LeagueId,
): ProfileSignal | null {
  const delta = ref.totalPointsDelta;
  if (!meetsScoringHighlightThreshold(delta)) return null;

  const unit = LEAGUES[leagueId].metrics.scoreUnitPlural;

  return {
    kind: "scoring-delta",
    headline: `${scoringPaceInsight(delta)} · ${formatSigned(delta)} vs league avg`,
    body: `${ref.name}'s games average ${ref.avgTotalPoints} combined ${unit}, ${formatSigned(delta)} vs the ${meta.leagueAvgTotal} league baseline across ${ref.games} games.`,
    stats: [
      {
        label: "Scoring delta",
        value: formatSigned(delta),
        detail: `vs ${meta.leagueAvgTotal} league avg`,
      },
      {
        label: "Over benchmark",
        value: formatPct(ref.overRate),
        detail: `${meta.leagueOverBaseline} ${unit} line`,
      },
    ],
    notable: Math.abs(delta) >= scoringThreshold(leagueId) * 2,
  };
}

function buildWhistleSignal(
  ref: RefProfile,
  meta: RefStatsFile["meta"],
  leagueId: LeagueId,
): ProfileSignal | null {
  const delta = whistleDelta(ref, leagueId);
  if (!meetsWhistleHighlightThreshold(delta, leagueId)) return null;
  const threshold = whistleThreshold(leagueId);

  const whistle = LEAGUES[leagueId].metrics.whistlePlain;

  return {
    kind: "whistle-delta",
    headline: `${whistleInflationHeadline(delta, whistle)} · ${formatSigned(delta)} vs avg`,
    body: `This crew averages ${ref.avgFouls} ${whistle} per game (${formatSigned(delta)} vs league). Whistle rate alone does not predict scoring; compare with the scoring delta above.`,
    stats: [
      {
        label: "Whistle delta",
        value: formatSigned(delta),
        detail: `vs ${meta.leagueAvgFouls} league avg`,
      },
      {
        label: "Sample",
        value: `${ref.games} games`,
      },
    ],
    notable: Math.abs(delta) >= threshold * 1.25,
  };
}

function buildOverTiltSignal(
  ref: RefProfile,
  meta: RefStatsFile["meta"],
  leagueId: LeagueId,
): ProfileSignal | null {
  const tilt = ref.overRate - 0.5;
  if (Math.abs(tilt) < overTiltThreshold()) return null;

  return {
    kind: "over-tilt",
    headline: `${overTiltInsight(tilt)} · ${formatPct(ref.overRate)} over rate`,
    body: `${formatPct(ref.overRate)} of ${ref.name}'s ${ref.games} games beat the combined ${meta.leagueOverBaseline} benchmark, ${formatSigned(tilt * 100)} percentage points from a neutral 50% split.`,
    stats: [
      {
        label: "Over rate",
        value: formatPct(ref.overRate),
        detail: "50% = no lean",
      },
      {
        label: "Avg combined",
        value: String(ref.avgTotalPoints),
        detail: formatSigned(ref.totalPointsDelta),
      },
    ],
    notable: Math.abs(tilt) >= 0.06,
  };
}

function buildHomeRoadSignal(
  betting: RefBettingStats,
  leagueId: LeagueId,
): ProfileSignal | null {
  const gap = betting.avgHomeScore - betting.avgRoadScore;
  const threshold = homeRoadThreshold(leagueId);
  if (Math.abs(gap) < threshold) return null;

  const unit = LEAGUES[leagueId].metrics.scoreUnitPlural;
  const lean = gap > 0 ? "home teams score more" : "road teams score more";

  return {
    kind: "home-road-scoring",
    headline: `Home/road scoring split, ${lean}`,
    body: `When this official works, home teams average ${betting.avgHomeScore} ${unit} vs ${betting.avgRoadScore} for visitors (${formatSigned(gap)} gap). This describes historical scoring splits, not a betting recommendation.`,
    stats: [
      {
        label: "Avg home score",
        value: String(betting.avgHomeScore),
      },
      {
        label: "Avg road score",
        value: String(betting.avgRoadScore),
      },
      {
        label: "Home margin",
        value: String(betting.avgHomeMargin),
        detail: "Home − away",
      },
    ],
    notable: Math.abs(gap) >= threshold * 1.5,
  };
}

function buildHomeAtsSignal(betting: RefBettingStats): ProfileSignal | null {
  if (!betting.linesAvailable) return null;
  const record = betting.homeTeamAts;
  const decisions = record.wins + record.losses;
  if (decisions < 20) return null;

  const rate = record.wins / decisions;
  const edge = rate - 0.5;
  if (Math.abs(edge) < 0.05) return null;

  const direction = edge > 0 ? "cover" : "fade";

  return {
    kind: "home-ats",
    headline: `${homeAtsSignalHeadline(edge)} · ${formatPctFromWlp(record.wins, record.losses, record.pushes)} home ATS`,
    body: `Home sides ${direction} the spread at ${formatPctFromWlp(record.wins, record.losses, record.pushes)} ATS (${record.wins}-${record.losses}${record.pushes ? `-${record.pushes}` : ""}) across ${decisions} lined games. Closing lines may be estimated where sportsbook data is unavailable; treat as exploratory.`,
    stats: [
      {
        label: "Home ATS",
        value: formatPctFromWlp(record.wins, record.losses, record.pushes),
        detail: `${decisions} decisive games`,
      },
      {
        label: "vs 50%",
        value: `${formatSigned(edge * 100)} pts`,
      },
    ],
    notable: Math.abs(edge) >= 0.08,
  };
}

export function computeProfileSignals(
  ref: RefProfile,
  meta: RefStatsFile["meta"],
  leagueId: LeagueId,
): ProfileSignalsBundle {
  const signals: ProfileSignal[] = [];

  const scoring = buildScoringSignal(ref, meta, leagueId);
  if (scoring) signals.push(scoring);

  const whistle = buildWhistleSignal(ref, meta, leagueId);
  if (whistle) signals.push(whistle);

  const over = buildOverTiltSignal(ref, meta, leagueId);
  if (over) signals.push(over);

  if (ref.bettingStats) {
    const homeRoad = buildHomeRoadSignal(ref.bettingStats, leagueId);
    if (homeRoad) signals.push(homeRoad);

    const homeAts = buildHomeAtsSignal(ref.bettingStats);
    if (homeAts) signals.push(homeAts);
  }

  const notableCount = signals.filter((s) => s.notable).length;
  const seasonRange =
    meta.dateRange != null
      ? `${meta.dateRange.earliest} – ${meta.dateRange.latest}`
      : ref.seasons.join(", ");

  return {
    signals,
    notableCount,
    sampleGames: ref.games,
    seasons: ref.seasons,
    seasonRange,
    dataSource: meta.source,
    sampleGate: sampleGateStatus(ref.games, meta.minSampleSize),
    overBaseline: meta.leagueOverBaseline,
  };
}

export function countNotableSignals(
  ref: RefProfile,
  meta: RefStatsFile["meta"],
  leagueId: LeagueId,
): number {
  return computeProfileSignals(ref, meta, leagueId).notableCount;
}
