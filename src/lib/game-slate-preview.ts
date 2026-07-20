import { LEAGUE_MANIFEST } from "@/lib/league-manifest";
import { LEAGUES } from "@/lib/leagues";
import {
  isSlatePreviewLeague,
  SLATE_PREVIEW_ADAPTERS,
  type SlatePreviewLeagueId,
} from "@/lib/game-slate-preview-adapters";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { sportCopy } from "@/lib/user-language";
import { formatPremiumLabel } from "@/lib/whistle-premium";
import type {
  AssignmentGame,
  OddsFile,
  RefProfile,
  RefRole,
  RefTeamStat,
} from "@/lib/types";

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
  crew: Array<{
    name: string;
    number: number;
    slug: string;
    role?: RefRole;
  }>;
  refTeamRows: GameSlatePreviewRefRow[];
  storylines: GameSlatePreviewStoryline[];
  outlierNotes: string[];
};

const MIN_REF_TEAM_GAMES = 5;
const MIN_WIN_RATE_OUTLIER = 0.1;
const MIN_FOUL_OUTLIER = 1.5;

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
    const slug = adapter.refSlug(official.name, official.number);
    const profile = stats.refs.find((ref) => ref.slug === slug);
    if (!profile?.teamStats) continue;

    for (const team of teams) {
      const teamStat = profile.teamStats[team.abbr];
      if (!teamStat || teamStat.games < MIN_REF_TEAM_GAMES) continue;
      const outlierNote = outlierNoteForTeamStat(teamStat, profile, team.abbr);
      rows.push({
        refSlug: slug,
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

export function buildGameSlatePreview(
  leagueId: SlatePreviewLeagueId,
  game: AssignmentGame,
  odds: OddsFile,
): GameSlatePreviewPayload | null {
  if (!isSlatePreviewLeague(leagueId)) return null;

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
  const outlierNotes = refTeamRows
    .filter((row) => row.isOutlier && row.outlierNote)
    .map((row) => `${row.refName} · ${row.teamAbbr}: ${row.outlierNote}`);

  return {
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
    crew: game.crew.map((official) => ({
      name: official.name,
      number: official.number,
      slug: adapter.refSlug(official.name, official.number),
      role: official.role,
    })),
    refTeamRows,
    storylines,
    outlierNotes,
  };
}
