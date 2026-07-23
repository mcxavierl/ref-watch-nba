import type { OfficiatingFingerprintData } from "@/lib/analytics/officiating-fingerprint";
import { buildCrewOfficiatingFingerprints } from "@/lib/analytics/officiating-fingerprint";
import { LEAGUE_MANIFEST } from "@/lib/league-manifest";
import { LEAGUES } from "@/lib/leagues";
import {
  isSlatePreviewLeague,
  SLATE_PREVIEW_ADAPTERS,
  type SlatePreviewLeagueId,
} from "@/lib/game-slate-preview-adapters";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import {
  buildOverviewLastMeetingLine,
  buildOverviewMatchupInsight,
  buildOverviewRecentGameContextLine,
  buildOverviewTeamRecentContextLine,
  buildOverviewTeamRecentLines,
} from "@/lib/overview-matchup-insight";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { sportCopy } from "@/lib/user-language";
import { formatPremiumLabel } from "@/lib/whistle-premium";
import { resolveWnbaRefProfile } from "@/lib/wnba/data";
import {
  isWnbaAllStarMatchup,
  resolveWnbaTeamAbbr,
  wnbaAllStarEventLabel,
} from "@/lib/wnba/teams";
import { wnbaAbbrAliases } from "@/lib/wnba/abbr";
import type {
  AssignmentGame,
  OddsFile,
  RefProfile,
  RefRole,
  RefTeamStat,
} from "@/lib/types";
import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import { buildGameSlateBroadcastExport } from "@/lib/media/media-card-content";
import {
  HIGHLIGHT_SCORING_DELTA_MIN,
  HIGHLIGHT_WHISTLE_DELTA_MIN,
} from "@/lib/highlight-badge";
import type { MediaBroadcastExport } from "@/lib/media/media-card-types";
import { buildIntelligenceCardContent } from "@/lib/intelligence/build-intelligence-card";
import type { IntelligenceCardContent } from "@/lib/intelligence/intelligence-card-types";

export type GameSlatePreviewRefRow = {
  refSlug: string;
  refName: string;
  refNumber: number;
  role?: string;
  teamAbbr: string;
  teamLabel: string;
  games: number;
  record: string;
  winRate: number;
  avgTotal: number;
  overRate: number;
  foulsDelta: number;
  isOutlier: boolean;
  outlierNote?: string;
};

export type GameSlatePreviewStoryline = {
  headline: string;
  summary: string;
};

export type GameSlatePreviewTeamInsight = {
  refSlug: string;
  refName: string;
  winRate: number;
  foulsDelta: number;
  winRateCritical: boolean;
  foulsDeltaCritical: boolean;
};

export type GameSlatePreviewTeamImpact = {
  teamAbbr: string;
  teamLabel: string;
  insights: GameSlatePreviewTeamInsight[];
};

export type GameSlateMatchupBriefing = {
  headline: string;
  lines: string[];
  h2hGames: number;
  avgTotalPoints: number;
  avgFouls: number;
  overRate: number;
  lastMeeting?: string;
};

export type GameSlatePreviewPayload = {
  gameId: string;
  leagueId: SlatePreviewLeagueId;
  leagueLabel: string;
  sport: SlatePreviewLeagueId;
  basePath: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  awayAbbr?: string;
  homeAbbr?: string;
  ouLean: "over" | "under" | "neutral";
  insufficientSample: boolean;
  sampleGames: number;
  scoringLabel: string;
  whistleLabel: string;
  avgTotalPoints: number;
  totalPointsDelta: number;
  overRate: number;
  avgFouls: number;
  foulsDelta: number;
  premiumGap?: number;
  premiumLabel?: string;
  homeBiasHeadline?: string;
  awaitingCrew?: boolean;
  matchupBriefing?: GameSlateMatchupBriefing;
  crew: Array<{
    name: string;
    number: number;
    slug: string;
    role?: RefRole;
  }>;
  refTeamRows: GameSlatePreviewRefRow[];
  teamImpacts: GameSlatePreviewTeamImpact[];
  storylines: GameSlatePreviewStoryline[];
  broadcastExport?: MediaBroadcastExport;
  intelligenceCard?: IntelligenceCardContent;
  crewFingerprints?: Array<{
    slug: string;
    name: string;
    role?: RefRole;
    fingerprint: OfficiatingFingerprintData;
  }>;
};

const MIN_REF_TEAM_GAMES = 5;
const MIN_WIN_RATE_OUTLIER = 0.1;
const MIN_FOUL_OUTLIER = 1.5;

/** Section title for ref×team outlier notes in the game preview drawer. */
export { refVsTeamsSectionLabel } from "@/lib/game-slate-matchup-insights";

export function buildRefTeamOutlierNotes(
  refTeamRows: GameSlatePreviewRefRow[],
): string[] {
  return refTeamRows
    .filter((row) => row.isOutlier && row.outlierNote)
    .map((row) => `${row.refName} · ${row.teamAbbr}: ${row.outlierNote}`);
}

function formatRecord(stat: RefTeamStat): string {
  if (stat.wins !== undefined && stat.losses !== undefined) {
    const ties = stat.ties ? `-${stat.ties}` : "";
    return `${stat.wins}-${stat.losses}${ties}`;
  }
  return `${stat.games} gp`;
}

function outlierNoteForTeamStat(
  stat: RefTeamStat,
  profile: RefProfile,
  teamAbbr: string,
): string | undefined {
  const notes: string[] = [];
  if (stat.winRate >= 0.62) {
    notes.push(`${Math.round(stat.winRate * 100)}% win rate with ${teamAbbr}`);
  } else if (stat.winRate <= 0.38 && stat.games >= MIN_REF_TEAM_GAMES) {
    notes.push(`only ${Math.round(stat.winRate * 100)}% win rate with ${teamAbbr}`);
  }
  if (stat.avgFoulDifferential >= MIN_FOUL_OUTLIER) {
    notes.push(`+${stat.avgFoulDifferential.toFixed(1)} fouls on ${teamAbbr} per game`);
  } else if (stat.avgFoulDifferential <= -MIN_FOUL_OUTLIER) {
    notes.push(`${stat.avgFoulDifferential.toFixed(1)} fouls on ${teamAbbr} per game`);
  }
  if (stat.overRate >= 0.58 || stat.overRate <= 0.42) {
    notes.push(`${formatPct(stat.overRate)} over rate with ${teamAbbr}`);
  }
  if (profile.totalPointsDelta >= 3 || profile.totalPointsDelta <= -3) {
    notes.push(`${formatSigned(profile.totalPointsDelta)} scoring vs league overall`);
  }
  return notes.length > 0 ? notes.join(" · ") : undefined;
}

function isOutlierStat(stat: RefTeamStat, profile: RefProfile): boolean {
  return (
    stat.games >= MIN_REF_TEAM_GAMES &&
    (Math.abs(stat.winRate - 0.5) >= MIN_WIN_RATE_OUTLIER ||
      Math.abs(stat.avgFoulDifferential) >= MIN_FOUL_OUTLIER ||
      stat.overRate >= 0.58 ||
      stat.overRate <= 0.42 ||
      Math.abs(profile.totalPointsDelta) >= 3)
  );
}

function buildRefTeamRows(
  game: AssignmentGame,
  leagueId: SlatePreviewLeagueId,
  stats: ReturnType<typeof loadLeagueStats>["stats"],
): GameSlatePreviewRefRow[] {
  const adapter = SLATE_PREVIEW_ADAPTERS[leagueId];
  const teams = adapter.detectTeams(game.awayTeam, game.homeTeam);
  const rows: GameSlatePreviewRefRow[] = [];

  for (const official of game.crew) {
    const profile =
      leagueId === "wnba"
        ? resolveWnbaRefProfile(official.name, official.number, stats)
        : stats.refs.find((ref) => ref.slug === adapter.refSlug(official.name, official.number));
    if (!profile?.teamStats) continue;

    for (const team of teams) {
      const teamStat = profile.teamStats[team.abbr];
      if (!teamStat || teamStat.games < MIN_REF_TEAM_GAMES) continue;
      const outlierNote = outlierNoteForTeamStat(teamStat, profile, team.abbr);
      rows.push({
        refSlug: profile.slug,
        refName: profile.name,
        refNumber: profile.number,
        role: official.role,
        teamAbbr: team.abbr,
        teamLabel: team.name,
        games: teamStat.games,
        record: formatRecord(teamStat),
        winRate: teamStat.winRate,
        avgTotal: teamStat.avgTotalPoints,
        overRate: teamStat.overRate,
        foulsDelta: teamStat.avgFoulDifferential,
        isOutlier: isOutlierStat(teamStat, profile),
        outlierNote,
      });
    }
  }

  return rows.sort((a, b) => Number(b.isOutlier) - Number(a.isOutlier) || b.games - a.games);
}

function isWinRateCritical(winRate: number, games: number): boolean {
  return games >= MIN_REF_TEAM_GAMES && (winRate >= 0.62 || winRate <= 0.38);
}

function isFoulsDeltaCritical(foulsDelta: number): boolean {
  return Math.abs(foulsDelta) >= MIN_FOUL_OUTLIER;
}

function buildTeamImpacts(
  refTeamRows: GameSlatePreviewRefRow[],
  teamOrder: Array<{ abbr: string; name: string }>,
): GameSlatePreviewTeamImpact[] {
  const byTeam = new Map<string, GameSlatePreviewRefRow[]>();
  for (const row of refTeamRows) {
    const list = byTeam.get(row.teamAbbr) ?? [];
    list.push(row);
    byTeam.set(row.teamAbbr, list);
  }

  const impacts: GameSlatePreviewTeamImpact[] = [];
  for (const team of teamOrder) {
    const rows = byTeam.get(team.abbr);
    if (!rows?.length) continue;
    impacts.push({
      teamAbbr: team.abbr,
      teamLabel: team.name,
      insights: rows
        .sort((a, b) => Number(b.isOutlier) - Number(a.isOutlier) || b.games - a.games)
        .map((row) => ({
          refSlug: row.refSlug,
          refName: row.refName,
          winRate: row.winRate,
          foulsDelta: row.foulsDelta,
          winRateCritical: isWinRateCritical(row.winRate, row.games),
          foulsDeltaCritical: isFoulsDeltaCritical(row.foulsDelta),
        })),
    });
  }
  return impacts;
}

type PreviewCardInsightCandidate = {
  score: number;
  text: string;
};

function previewInsightScoreForRow(row: GameSlatePreviewRefRow): number {
  let score = 70;
  if (row.isOutlier) score += 8;
  if (isFoulsDeltaCritical(row.foulsDelta)) score += 6;
  if (isWinRateCritical(row.winRate, row.games)) score += 5;
  score += Math.abs(row.winRate - 0.5) * 20;
  score += Math.min(Math.abs(row.foulsDelta), 4) * 2;
  return score;
}

function previewInsightTextForTeamInsight(
  impact: GameSlatePreviewTeamImpact,
  insight: GameSlatePreviewTeamInsight,
): string | undefined {
  const parts: string[] = [];
  if (insight.winRateCritical) {
    parts.push(`${formatPct(insight.winRate)} win rate with ${impact.teamAbbr}`);
  }
  if (insight.foulsDeltaCritical) {
    parts.push(`${formatSigned(insight.foulsDelta)} fouls on ${impact.teamAbbr}`);
  }
  if (parts.length === 0) return undefined;
  return `${insight.refName}: ${parts.join(" · ")}`;
}

/** Pick the strongest ref-preview insights for compact upcoming-game cards. */
export function selectGameSlatePreviewCardInsights(
  preview: GameSlatePreviewPayload,
  limit = 2,
): string[] {
  const candidates: PreviewCardInsightCandidate[] = [];

  if (preview.homeBiasHeadline) {
    candidates.push({ score: 96, text: preview.homeBiasHeadline });
  }

  for (const story of preview.storylines) {
    const text = story.summary?.trim()
      ? `${story.headline}. ${story.summary.trim()}`
      : story.headline;
    candidates.push({ score: 92, text });
  }

  for (const row of preview.refTeamRows) {
    if (!row.outlierNote) continue;
    candidates.push({
      score: previewInsightScoreForRow(row),
      text: `${row.refName} · ${row.teamAbbr}: ${row.outlierNote}`,
    });
  }

  for (const impact of preview.teamImpacts) {
    for (const insight of impact.insights) {
      if (!insight.winRateCritical && !insight.foulsDeltaCritical) continue;
      const text = previewInsightTextForTeamInsight(impact, insight);
      if (!text) continue;
      let score = 74;
      if (insight.foulsDeltaCritical) score += 7;
      if (insight.winRateCritical) score += 4;
      candidates.push({ score, text });
    }
  }

  if (!preview.insufficientSample) {
    // Crew trend lines use the same materiality gates as highlight-badge.ts.
    if (Math.abs(preview.totalPointsDelta) >= HIGHLIGHT_SCORING_DELTA_MIN) {
      candidates.push({
        score: 48,
        text: `Crew trends ${formatSigned(preview.totalPointsDelta)} ${preview.scoringLabel.toLowerCase()} vs average`,
      });
    }
    if (Math.abs(preview.foulsDelta) >= HIGHLIGHT_WHISTLE_DELTA_MIN) {
      candidates.push({
        score: 44,
        text: `Crew trends ${formatSigned(preview.foulsDelta)} ${preview.whistleLabel.toLowerCase()} vs average`,
      });
    }
    if (preview.premiumLabel && preview.premiumGap !== undefined && Math.abs(preview.premiumGap) >= 2) {
      candidates.push({
        score: 42,
        text: `${formatSigned(preview.premiumGap)} vs benchmark · ${preview.premiumLabel}`,
      });
    }
  }

  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((candidate) => {
      if (seen.has(candidate.text)) return false;
      seen.add(candidate.text);
      return true;
    })
    .slice(0, limit)
    .map((candidate) => candidate.text);
}

const LEAGUE_TO_DATA: Partial<Record<SlatePreviewLeagueId, RuntimeGameLogEntry["league"]>> = {
  nba: "NBA",
  wnba: "WNBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
};

function teamAliasesForLeague(
  leagueId: SlatePreviewLeagueId,
  abbr: string,
): string[] {
  const key = abbr.toUpperCase();
  if (leagueId === "wnba") return wnbaAbbrAliases(resolveWnbaTeamAbbr(key));
  if (leagueId === "nfl" && (key === "LAC" || key === "SD")) return ["LAC", "SD"];
  return [key];
}

function isHeadToHeadMeeting(
  game: RuntimeGameLogEntry,
  awayTeam: string,
  homeTeam: string,
  leagueId: SlatePreviewLeagueId,
): boolean {
  const away = new Set(teamAliasesForLeague(leagueId, awayTeam));
  const home = new Set(teamAliasesForLeague(leagueId, homeTeam));
  const gameAway = game.awayTeam.toUpperCase();
  const gameHome = game.homeTeam.toUpperCase();
  return (
    (away.has(gameAway) && home.has(gameHome)) ||
    (away.has(gameHome) && home.has(gameAway))
  );
}

function headToHeadMeetings(
  leagueId: SlatePreviewLeagueId,
  awayTeam: string,
  homeTeam: string,
): RuntimeGameLogEntry[] {
  const dataLeague = LEAGUE_TO_DATA[leagueId];
  if (!dataLeague) return [];
  const logs = loadRuntimeGameLogs(dataLeague);
  if (!logs?.games?.length) return [];

  return logs.games
    .filter((game) => isHeadToHeadMeeting(game, awayTeam, homeTeam, leagueId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.gameId.localeCompare(a.gameId));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function overRateFromGames(games: RuntimeGameLogEntry[], closingTotal?: number): number {
  if (games.length === 0) return 0.5;
  const threshold = closingTotal ?? average(games.map((game) => game.closingTotal));
  const overs = games.filter((game) => game.totalPoints > threshold).length;
  return overs / games.length;
}

function buildMatchupSlatePreview(
  leagueId: SlatePreviewLeagueId,
  game: AssignmentGame,
  odds: OddsFile,
): GameSlatePreviewPayload | null {
  const adapter = SLATE_PREVIEW_ADAPTERS[leagueId];
  const teams = adapter.detectTeams(game.awayTeam, game.homeTeam);
  const copy = sportCopy(leagueId);
  const manifest = LEAGUE_MANIFEST[leagueId];
  const awayAbbr = teams[0]?.abbr ?? game.awayTeam;
  const homeAbbr = teams[1]?.abbr ?? game.homeTeam;
  const meetings = headToHeadMeetings(leagueId, awayAbbr, homeAbbr);
  const { stats } = loadLeagueStats(leagueId);
  const oddsLine =
    odds.lines.find((line) => line.gameId === game.id) ??
    odds.lines.find(
      (line) =>
        line.awayTeam.toUpperCase() === game.awayTeam.toUpperCase() &&
        line.homeTeam.toUpperCase() === game.homeTeam.toUpperCase(),
    );
  const closingTotal = oddsLine?.total;

  const avgTotalPoints = average(meetings.map((entry) => entry.totalPoints));
  const avgFouls = average(meetings.map((entry) => entry.totalFouls));
  const leagueAvgTotal = stats.meta.leagueOverBaseline;
  const leagueAvgFouls =
    stats.refs.length > 0
      ? stats.refs.reduce((sum, ref) => sum + ref.avgFouls, 0) / stats.refs.length
      : avgFouls;
  const overRate = overRateFromGames(meetings, closingTotal);
  const matchupInsight = buildOverviewMatchupInsight(leagueId, awayAbbr, homeAbbr);
  const lastMeeting = buildOverviewLastMeetingLine(leagueId, awayAbbr, homeAbbr);
  const recentContext = buildOverviewRecentGameContextLine(leagueId, awayAbbr, homeAbbr);
  const teamContext = buildOverviewTeamRecentContextLine(leagueId, awayAbbr, homeAbbr);

  const briefingLines = [
    matchupInsight,
    lastMeeting,
    recentContext,
    teamContext,
    closingTotal !== undefined
      ? `Closing total: ${closingTotal} · H2H over rate ${formatPct(overRate)}`
      : meetings.length > 0
        ? `Head-to-head over rate: ${formatPct(overRate)} across ${meetings.length} meetings`
        : undefined,
  ].filter((line): line is string => Boolean(line));

  if (meetings.length === 0) {
    for (const line of buildOverviewTeamRecentLines(leagueId, awayAbbr, homeAbbr)) {
      if (!briefingLines.includes(line)) {
        briefingLines.push(line);
      }
    }
  }

  const isAllStarEvent =
    leagueId === "wnba" && isWnbaAllStarMatchup(awayAbbr, homeAbbr);

  if (isAllStarEvent) {
    briefingLines.length = 0;
    briefingLines.push(
      `${wnbaAllStarEventLabel()} · ${awayAbbr} vs ${homeAbbr} exhibition rosters.`,
      "All-Star showcase event - franchise head-to-head history does not apply.",
    );
  } else if (briefingLines.length === 0) {
    briefingLines.push(
      `${awayAbbr} at ${homeAbbr}: no published head-to-head sample yet. Check back when logs refresh.`,
    );
  }

  const ouLean: GameSlatePreviewPayload["ouLean"] =
    overRate >= 0.55 ? "over" : overRate <= 0.45 ? "under" : "neutral";

  return {
    gameId: game.id,
    leagueId,
    leagueLabel: LEAGUES[leagueId].label,
    sport: leagueId,
    basePath: manifest.pathPrefix,
    matchup: game.matchup,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
    awayAbbr,
    homeAbbr,
    ouLean,
    awaitingCrew: true,
    insufficientSample: meetings.length < 3,
    sampleGames: meetings.length,
    scoringLabel: copy.scoringLabel,
    whistleLabel: copy.whistleLabel,
    avgTotalPoints: round1(avgTotalPoints),
    totalPointsDelta: round1(avgTotalPoints - leagueAvgTotal),
    overRate,
    avgFouls: round1(avgFouls),
    foulsDelta: round1(avgFouls - leagueAvgFouls),
    premiumGap:
      closingTotal !== undefined ? round1(avgTotalPoints - closingTotal) : undefined,
    premiumLabel:
      closingTotal !== undefined && avgTotalPoints > closingTotal
        ? "Above closing total"
        : closingTotal !== undefined && avgTotalPoints < closingTotal
          ? "Below closing total"
          : undefined,
    matchupBriefing: {
      headline: isAllStarEvent
        ? wnbaAllStarEventLabel()
        : `${awayAbbr} at ${homeAbbr} matchup sheet`,
      lines: briefingLines,
      h2hGames: meetings.length,
      avgTotalPoints: round1(avgTotalPoints),
      avgFouls: round1(avgFouls),
      overRate,
      lastMeeting,
    },
    crew: [],
    refTeamRows: [],
    teamImpacts: [],
    storylines: [],
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildGameSlatePreview(
  leagueId: SlatePreviewLeagueId,
  game: AssignmentGame,
  odds: OddsFile,
): GameSlatePreviewPayload | null {
  if (!isSlatePreviewLeague(leagueId)) return null;
  if (game.crew.length === 0) {
    return buildMatchupSlatePreview(leagueId, game, odds);
  }

  const adapter = SLATE_PREVIEW_ADAPTERS[leagueId];
  const { stats } = loadLeagueStats(leagueId);
  const metrics = adapter.computeCrewMetrics(game.crew, stats);
  const teams = adapter.detectTeams(game.awayTeam, game.homeTeam);
  const copy = sportCopy(leagueId);
  const manifest = LEAGUE_MANIFEST[leagueId];
  const premium = adapter.computePremium?.(game, stats, odds);
  const homeBias = adapter.computeHomeBias?.(game, stats);
  const storylines =
    adapter.computeStorylines?.(game, stats, 3).map((story) => ({
      headline: story.headline,
      summary: story.summary,
    })) ?? [];

  const refTeamRows = buildRefTeamRows(game, leagueId, stats);
  const teamImpacts = buildTeamImpacts(refTeamRows, teams);
  const crewFingerprints = buildCrewOfficiatingFingerprints(
    leagueId,
    game.crew.map((official) => ({
      slug: adapter.refSlug(official.name, official.number),
      name: official.name,
      role: official.role,
    })),
    stats,
  );

  const preview: GameSlatePreviewPayload = {
    gameId: game.id,
    leagueId,
    leagueLabel: LEAGUES[leagueId].label,
    sport: leagueId,
    basePath: manifest.pathPrefix,
    matchup: game.matchup,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
    awayAbbr: teams[0]?.abbr,
    homeAbbr: teams[1]?.abbr,
    ouLean: metrics.ouLean,
    insufficientSample: metrics.insufficientSample,
    sampleGames: metrics.sampleGames,
    scoringLabel: copy.scoringLabel,
    whistleLabel: copy.whistleLabel,
    avgTotalPoints: metrics.avgTotalPoints,
    totalPointsDelta: metrics.totalPointsDelta,
    overRate: metrics.overRate,
    avgFouls: metrics.avgFouls,
    foulsDelta: metrics.foulsDelta,
    premiumGap: premium?.gapVsBenchmark,
    premiumLabel: premium ? formatPremiumLabel(premium.scoringPremium) : undefined,
    homeBiasHeadline:
      homeBias && homeBias.kind !== "neutral" ? homeBias.headline : undefined,
    crew: game.crew.map((official) => {
      const profile =
        leagueId === "wnba"
          ? resolveWnbaRefProfile(official.name, official.number, stats)
          : undefined;
      const slug = profile?.slug ?? adapter.refSlug(official.name, official.number);
      return {
        name: profile?.name ?? official.name,
        number: profile?.number ?? official.number,
        slug,
        role: official.role,
      };
    }),
    refTeamRows,
    teamImpacts,
    storylines,
    crewFingerprints,
  };

  const evidence = buildProjectionEvidence(preview);
  preview.broadcastExport = buildGameSlateBroadcastExport(preview, evidence);
  if (!preview.insufficientSample && preview.crew.length > 0) {
    preview.intelligenceCard = buildIntelligenceCardContent(preview);
  }

  return preview;
}

export { resolveMatchupDrawerBriefing } from "@/lib/resolve-matchup-drawer-briefing";

