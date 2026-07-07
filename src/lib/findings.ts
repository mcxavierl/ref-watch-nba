import { formatPct, getRefStats } from "@/lib/data";
import { getTeam, teamFullName } from "@/lib/teams";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export interface FindingLink {
  label: string;
  href: string;
}

export interface FindingStat {
  label: string;
  value: string;
  detail?: string;
}

export interface Finding {
  id: string;
  headline: string;
  summary: string;
  stats: FindingStat[];
  sampleNote: string;
  links: FindingLink[];
}

interface RefTeamAggregate {
  team: string;
  games: number;
  winRate: number;
  foulDiff: number;
  overRate: number;
  avgTotal: number;
}

function aggregateRefTeams(
  stats: RefStatsFile,
): Map<string, RefTeamAggregate[]> {
  const byRef = new Map<string, Map<string, RefTeamAggregate>>();

  for (const [team, splits] of Object.entries(stats.teamSplits)) {
    for (const split of splits) {
      for (const slug of split.crewKey.split("|")) {
        let teamMap = byRef.get(slug);
        if (!teamMap) {
          teamMap = new Map();
          byRef.set(slug, teamMap);
        }

        const existing = teamMap.get(team);
        if (existing) {
          const nextGames = existing.games + split.games;
          existing.winRate =
            (existing.winRate * existing.games +
              (split.wins / split.games) * split.games) /
            nextGames;
          existing.foulDiff =
            (existing.foulDiff * existing.games +
              split.foulDifferential * split.games) /
            nextGames;
          existing.overRate =
            (existing.overRate * existing.games +
              split.overRate * split.games) /
            nextGames;
          existing.avgTotal =
            (existing.avgTotal * existing.games +
              split.avgTotalPoints * split.games) /
            nextGames;
          existing.games = nextGames;
        } else {
          teamMap.set(team, {
            team,
            games: split.games,
            winRate: split.wins / split.games,
            foulDiff: split.foulDifferential,
            overRate: split.overRate,
            avgTotal: split.avgTotalPoints,
          });
        }
      }
    }
  }

  const result = new Map<string, RefTeamAggregate[]>();
  for (const [slug, teamMap] of byRef) {
    result.set(slug, [...teamMap.values()]);
  }
  return result;
}

function leagueUnderFinding(stats: RefStatsFile): Finding {
  const { refs, meta } = stats;
  const underCount = refs.filter((r) => r.overRate < 0.5).length;
  const overCount = refs.filter((r) => r.overRate > 0.5).length;
  const totalGames =
    meta.totalGamesProcessed ??
    refs.reduce((sum, r) => sum + r.games, 0);
  const weightedOver =
    refs.reduce((sum, r) => sum + r.overRate * r.games, 0) /
    refs.reduce((sum, r) => sum + r.games, 0);
  const underPct = Math.round((underCount / refs.length) * 100);

  return {
    id: "league-under-bias",
    headline: "The league tilts under — almost every ref",
    summary: `Across ${meta.seasons.length} simulated seasons, ${underCount} of ${refs.length} officials (${underPct}%) call games that finish below the ${meta.leagueOverBaseline}-point benchmark more often than not. Only ${overCount} refs trend over. The weighted hit rate is ${formatPct(weightedOver)} — roughly five points below a coin flip.`,
    stats: [
      {
        label: "Refs trending under",
        value: `${underCount}/${refs.length}`,
        detail: `${underPct}% of the staff`,
      },
      {
        label: "League over rate",
        value: formatPct(weightedOver),
        detail: `vs 50% baseline (${meta.leagueOverBaseline} pts)`,
      },
      {
        label: "Games analyzed",
        value: totalGames.toLocaleString(),
        detail: meta.seasons.join(", "),
      },
    ],
    sampleNote: `Based on ${refs.length} refs across ${totalGames.toLocaleString()} games`,
    links: [{ label: "Browse all refs", href: "/refs" }],
  };
}

function extremeUnderRefFinding(stats: RefStatsFile): Finding {
  const minGames = 100;
  const ref = [...stats.refs]
    .filter((r) => r.games >= minGames)
    .sort((a, b) => a.overRate - b.overRate)[0];

  if (!ref) {
    return fallbackRefFinding();
  }

  const gap = (0.5 - ref.overRate) * 100;

  return {
    id: "extreme-under-ref",
    headline: `${ref.name} suppresses scoring most`,
    summary: `${ref.name} (#${ref.number}) is the strongest under ref in the dataset: just ${formatPct(ref.overRate)} of his ${ref.games} games clear ${stats.meta.leagueOverBaseline} combined points. That is ${gap.toFixed(0)} percentage points below a 50/50 split, with an average total of ${ref.avgTotalPoints} (${ref.totalPointsDelta >= 0 ? "+" : ""}${ref.totalPointsDelta} vs league avg).`,
    stats: [
      {
        label: "Games over 225",
        value: formatPct(ref.overRate),
        detail: `${ref.games} games officiated`,
      },
      {
        label: "Avg combined score",
        value: String(ref.avgTotalPoints),
        detail: `${ref.totalPointsDelta >= 0 ? "+" : ""}${ref.totalPointsDelta} vs ${stats.meta.leagueAvgTotal}`,
      },
      {
        label: "Fouls per game",
        value: String(ref.avgFouls),
        detail: `${ref.foulsDelta >= 0 ? "+" : ""}${ref.foulsDelta} vs league avg`,
      },
    ],
    sampleNote: `${ref.games} games · ${stats.meta.seasons.join(", ")}`,
    links: [
      {
        label: `${ref.name} profile`,
        href: `/refs/${ref.slug}`,
      },
    ],
  };
}

function fallbackRefFinding(): Finding {
  return {
    id: "extreme-under-ref",
    headline: "Under trends dominate the data",
    summary: "No single ref met the sample threshold for this finding.",
    stats: [],
    sampleNote: "Insufficient data",
    links: [{ label: "Browse refs", href: "/refs" }],
  };
}

function crossTeamWhistleFinding(
  stats: RefStatsFile,
  refTeams: Map<string, RefTeamAggregate[]>,
): Finding {
  const minTeamGames = 8;
  const minTeams = 4;

  let best:
    | {
        ref: RefProfile;
        favored: RefTeamAggregate;
        penalized: RefTeamAggregate;
        spread: number;
      }
    | undefined;

  for (const ref of stats.refs) {
    const teams = (refTeams.get(ref.slug) ?? []).filter(
      (t) => t.games >= minTeamGames,
    );
    if (teams.length < minTeams) continue;

    const favored = [...teams].sort((a, b) => b.foulDiff - a.foulDiff)[0];
    const penalized = [...teams].sort((a, b) => a.foulDiff - b.foulDiff)[0];
    const spread = favored.foulDiff - penalized.foulDiff;

    if (!best || spread > best.spread) {
      best = { ref, favored, penalized, spread };
    }
  }

  if (!best) {
    return whistleParadoxFinding(stats);
  }

  const { ref, favored, penalized, spread } = best;
  const favoredTeam = getTeam(favored.team);
  const penalizedTeam = getTeam(penalized.team);
  const favoredName = favoredTeam
    ? teamFullName(favoredTeam)
    : favored.team;
  const penalizedName = penalizedTeam
    ? teamFullName(penalizedTeam)
    : penalized.team;

  return {
    id: "cross-team-whistle",
    headline: `${ref.name} whistles differently by team`,
    summary: `The same official does not call every locker room the same way. With ${ref.name}, ${favoredName} draw ${favored.foulDiff >= 0 ? "+" : ""}${favored.foulDiff.toFixed(1)} more fouls per game than their opponents, while ${penalizedName} see the opposite at ${penalized.foulDiff.toFixed(1)}. That ${spread.toFixed(1)}-foul swing is one of the widest team-specific splits in the data.`,
    stats: [
      {
        label: `${favored.team} foul edge`,
        value: `${favored.foulDiff >= 0 ? "+" : ""}${favored.foulDiff.toFixed(1)}`,
        detail: `${favored.games} games · ${formatPct(favored.winRate)} wins`,
      },
      {
        label: `${penalized.team} foul edge`,
        value: `${penalized.foulDiff >= 0 ? "+" : ""}${penalized.foulDiff.toFixed(1)}`,
        detail: `${penalized.games} games · ${formatPct(penalized.winRate)} wins`,
      },
      {
        label: "Whistle swing",
        value: spread.toFixed(1),
        detail: "Fouls per game differential gap",
      },
    ],
    sampleNote: `${favored.games + penalized.games} games across two teams · min ${minTeamGames} per team`,
    links: [
      { label: ref.name, href: `/refs/${ref.slug}` },
      { label: favoredName, href: `/teams/${favored.team}` },
      { label: penalizedName, href: `/teams/${penalized.team}` },
    ],
  };
}

function whistleParadoxFinding(stats: RefStatsFile): Finding {
  const minGames = 100;
  const ref = [...stats.refs]
    .filter((r) => r.games >= minGames)
    .sort((a, b) => b.foulsDelta - a.foulsDelta)[0];

  return {
    id: "whistle-paradox",
    headline: `${ref.name} whistles heavy, scores stay low`,
    summary: `${ref.name} averages ${ref.avgFouls} fouls per game — ${ref.foulsDelta >= 0 ? "+" : ""}${ref.foulsDelta} above the league norm — yet only ${formatPct(ref.overRate)} of his ${ref.games} games beat ${stats.meta.leagueOverBaseline} points. More whistles do not automatically mean more free throws and points in this dataset.`,
    stats: [
      {
        label: "Fouls per game",
        value: String(ref.avgFouls),
        detail: `+${ref.foulsDelta} vs league avg`,
      },
      {
        label: "Games over 225",
        value: formatPct(ref.overRate),
        detail: `${ref.games} games`,
      },
      {
        label: "Avg combined score",
        value: String(ref.avgTotalPoints),
        detail: `${ref.totalPointsDelta >= 0 ? "+" : ""}${ref.totalPointsDelta} vs ${stats.meta.leagueAvgTotal}`,
      },
    ],
    sampleNote: `${ref.games} games · ${stats.meta.seasons.join(", ")}`,
    links: [{ label: `${ref.name} profile`, href: `/refs/${ref.slug}` }],
  };
}

export function computeFindings(): Finding[] {
  const stats = getRefStats();
  if (stats.refs.length === 0) return [];

  const refTeams = aggregateRefTeams(stats);

  return [
    leagueUnderFinding(stats),
    extremeUnderRefFinding(stats),
    crossTeamWhistleFinding(stats, refTeams),
  ];
}
