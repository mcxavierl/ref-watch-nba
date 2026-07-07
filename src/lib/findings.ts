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
  /** Plain-language “why this matters” follow-up. */
  explainer?: string;
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
    summary: `In this dataset, ${underCount} of ${refs.length} officials (${underPct}%) call games that finish below our ${meta.leagueOverBaseline}-point benchmark more often than above. Only ${overCount} refs trend the other way.`,
    explainer: `The league-wide over rate (${formatPct(weightedOver)}) is a games-weighted average: we count every game each ref worked, not one vote per ref. A ref with 150 games influences the number more than a ref with 20. We compare that share to 50% because, if there were no pattern, you'd expect about half of games to go over and half under — like a coin flip. At ${formatPct(weightedOver)}, unders land about five points more often than that neutral baseline. That matters because it's systemic: nearly the whole officiating staff leans the same direction in this sample, which points to era-wide pace and whistle trends rather than a few random outliers. If you're thinking about game totals, the default edge in this data is toward the under.`,
    stats: [
      {
        label: "Refs trending under",
        value: `${underCount}/${refs.length}`,
        detail: `${underPct}% of the staff`,
      },
      {
        label: "Games over 225 (weighted)",
        value: formatPct(weightedOver),
        detail: "All ref-games combined · 50% = no lean",
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

function rareOverRefsFinding(stats: RefStatsFile): Finding {
  const { refs, meta } = stats;
  const minGames = 50;
  const overRefs = refs
    .filter((r) => r.games >= minGames && r.overRate > 0.5)
    .sort((a, b) => b.overRate - a.overRate);
  const qualified = refs.filter((r) => r.games >= minGames);

  if (overRefs.length === 0) {
    return {
      id: "rare-over-refs",
      headline: "Overs are rare in this pool",
      summary: "No ref with a large sample trends over the benchmark.",
      stats: [],
      sampleNote: "Insufficient data",
      links: [{ label: "Browse refs", href: "/refs" }],
    };
  }

  const names = overRefs.map((r) => r.name).join(", ");

  return {
    id: "rare-over-refs",
    headline: `Only ${overRefs.length} refs trend over — out of ${qualified.length}`,
    summary: `Among officials with ${minGames}+ games, just ${overRefs.length} finish above the ${meta.leagueOverBaseline}-point benchmark more often than not. The rest of the qualified pool leans under.`,
    explainer: `That's roughly ${Math.round((overRefs.length / qualified.length) * 100)}% of high-volume refs — the over side is a small club, not the default. The members: ${names}. If you're hunting overs, the data says you need a specific ref (or crew) match-up — not a league-wide assumption. Compare that to the ${qualified.length - overRefs.length} qualified refs who still trend under despite similar workloads.`,
    stats: [
      {
        label: "Over refs",
        value: `${overRefs.length}/${qualified.length}`,
        detail: `${minGames}+ games each`,
      },
      {
        label: "Top over ref",
        value: formatPct(overRefs[0].overRate),
        detail: `${overRefs[0].name} · ${overRefs[0].games} games`,
      },
      {
        label: "League benchmark",
        value: String(meta.leagueOverBaseline),
        detail: "Combined pts proxy",
      },
    ],
    sampleNote: `${qualified.length} refs with ${minGames}+ games · ${meta.seasons.join(", ")}`,
    links: overRefs.slice(0, 3).map((r) => ({
      label: r.name,
      href: `/refs/${r.slug}`,
    })),
  };
}

function overRateTeamSplitFinding(stats: RefStatsFile): Finding {
  const minTeamGames = 8;
  const minSpread = 0.5;

  let best:
    | {
        ref: RefProfile;
        highTeam: string;
        highOver: number;
        highGames: number;
        lowTeam: string;
        lowOver: number;
        lowGames: number;
        spread: number;
      }
    | undefined;

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    const teams = Object.entries(ref.teamStats).filter(
      ([, st]) => st.games >= minTeamGames,
    );
    if (teams.length < 3) continue;

    const high = teams.reduce((a, b) =>
      a[1].overRate > b[1].overRate ? a : b,
    );
    const low = teams.reduce((a, b) =>
      a[1].overRate < b[1].overRate ? a : b,
    );
    const spread = high[1].overRate - low[1].overRate;

    if (spread >= minSpread && (!best || spread > best.spread)) {
      best = {
        ref,
        highTeam: high[0],
        highOver: high[1].overRate,
        highGames: high[1].games,
        lowTeam: low[0],
        lowOver: low[1].overRate,
        lowGames: low[1].games,
        spread,
      };
    }
  }

  if (!best) {
    return whistleParadoxFinding(stats);
  }

  const highName = getTeam(best.highTeam)
    ? teamFullName(getTeam(best.highTeam)!)
    : best.highTeam;
  const lowName = getTeam(best.lowTeam)
    ? teamFullName(getTeam(best.lowTeam)!)
    : best.lowTeam;

  return {
    id: "over-rate-team-split",
    headline: `${best.ref.name}'s over rate swings by opponent`,
    summary: `The same ref can run hot or cold on totals depending on who's playing. With ${best.ref.name}, ${formatPct(best.highOver)} of ${highName} games had combined scores above ${stats.meta.leagueOverBaseline} — ${lowName} games only ${formatPct(best.lowOver)}. This is historical scoring frequency, not sportsbook odds.`,
    explainer: `We use ${stats.meta.leagueOverBaseline} combined points as a stand-in when real closing lines aren't available. "Over" means home score + away score beat that number; "under" means it didn't. The ${(best.spread * 100).toFixed(0)}-point gap compares those hit rates to a neutral 50/50 split — not Vegas pricing. With ${best.highGames} ${best.highTeam} games and ${best.lowGames} ${best.lowTeam} games in the sample, the same ref's games look like a track meet with one team and a grind with another.`,
    stats: [
      {
        label: `${best.highTeam} over ${stats.meta.leagueOverBaseline}`,
        value: formatPct(best.highOver),
        detail: `${best.highGames} games · not betting odds`,
      },
      {
        label: `${best.lowTeam} over ${stats.meta.leagueOverBaseline}`,
        value: formatPct(best.lowOver),
        detail: `${best.lowGames} games · combined pts`,
      },
      {
        label: "Over-rate gap",
        value: `${(best.spread * 100).toFixed(0)} pts`,
        detail: `vs 50% neutral baseline`,
      },
    ],
    sampleNote: `Min ${minTeamGames} games per team · ${stats.meta.seasons.join(", ")}`,
    links: [
      { label: best.ref.name, href: `/refs/${best.ref.slug}` },
      { label: highName, href: `/teams/${best.highTeam}` },
      { label: lowName, href: `/teams/${best.lowTeam}` },
    ],
  };
}

function foulEdgeLosingFinding(stats: RefStatsFile): Finding {
  const minGames = 10;
  const minFoulEdge = 2.5;
  const maxWinRate = 0.35;

  let best:
    | {
        ref: RefProfile;
        team: string;
        foulDiff: number;
        winRate: number;
        games: number;
        avgTotal: number;
        overRate: number;
      }
    | undefined;

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    for (const [team, st] of Object.entries(ref.teamStats)) {
      if (
        st.games >= minGames &&
        st.avgFoulDifferential >= minFoulEdge &&
        st.winRate <= maxWinRate &&
        (!best || st.avgFoulDifferential > best.foulDiff)
      ) {
        best = {
          ref,
          team,
          foulDiff: st.avgFoulDifferential,
          winRate: st.winRate,
          games: st.games,
          avgTotal: st.avgTotalPoints,
          overRate: st.overRate,
        };
      }
    }
  }

  if (!best) {
    return crossTeamWhistleFinding(stats, aggregateRefTeams(stats));
  }

  const teamName = getTeam(best.team)
    ? teamFullName(getTeam(best.team)!)
    : best.team;

  return {
    id: "foul-edge-losing",
    headline: `${best.ref.name} helps ${best.team} on fouls — but they still lose`,
    summary: `With ${best.ref.name} on ${teamName} games, opponents are whistled ${best.foulDiff >= 0 ? "+" : ""}${best.foulDiff.toFixed(1)} more fouls per game than the ${best.team}. Yet ${teamName} win just ${formatPct(best.winRate)} of those games.`,
    explainer: `A foul edge doesn't automatically convert to wins or overs. These games average ${best.avgTotal} combined points with a ${formatPct(best.overRate)} over rate — so the whistle tilt and the scoreboard outcome can pull in opposite directions. That's the kind of mismatch worth flagging before assuming "more opponent fouls" means a friendly night for the favorite.`,
    stats: [
      {
        label: "Foul edge",
        value: `${best.foulDiff >= 0 ? "+" : ""}${best.foulDiff.toFixed(1)}`,
        detail: `${best.team} vs opponents`,
      },
      {
        label: "Win rate",
        value: formatPct(best.winRate),
        detail: `${best.games} games`,
      },
      {
        label: "Games over 225",
        value: formatPct(best.overRate),
        detail: `Avg ${best.avgTotal} combined pts`,
      },
    ],
    sampleNote: `${best.games} ${best.team} games · min ${minGames} game sample`,
    links: [
      { label: best.ref.name, href: `/refs/${best.ref.slug}` },
      { label: teamName, href: `/teams/${best.team}` },
    ],
  };
}

function scoringExtremesFinding(stats: RefStatsFile): Finding {
  const minGames = 10;
  const { meta } = stats;

  let hottest:
    | {
        ref: RefProfile;
        team: string;
        avgTotal: number;
        overRate: number;
        games: number;
      }
    | undefined;
  let coldest:
    | {
        ref: RefProfile;
        team: string;
        avgTotal: number;
        overRate: number;
        games: number;
      }
    | undefined;

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    for (const [team, st] of Object.entries(ref.teamStats)) {
      if (st.games < minGames) continue;
      if (!hottest || st.avgTotalPoints > hottest.avgTotal) {
        hottest = {
          ref,
          team,
          avgTotal: st.avgTotalPoints,
          overRate: st.overRate,
          games: st.games,
        };
      }
      if (!coldest || st.avgTotalPoints < coldest.avgTotal) {
        coldest = {
          ref,
          team,
          avgTotal: st.avgTotalPoints,
          overRate: st.overRate,
          games: st.games,
        };
      }
    }
  }

  if (!hottest || !coldest) {
    return whistleParadoxFinding(stats);
  }

  const hotTeam = getTeam(hottest.team)
    ? teamFullName(getTeam(hottest.team)!)
    : hottest.team;
  const coldTeam = getTeam(coldest.team)
    ? teamFullName(getTeam(coldest.team)!)
    : coldest.team;
  const gap = hottest.avgTotal - coldest.avgTotal;

  return {
    id: "scoring-extremes",
    headline: `${gap.toFixed(1)}-point spread between the hottest and coldest ref–team pairs`,
    summary: `The highest-scoring combo is ${hottest.ref.name} on ${hotTeam} games (${hottest.avgTotal} avg, ${formatPct(hottest.overRate)} over). The lowest is ${coldest.ref.name} on ${coldTeam} games (${coldest.avgTotal} avg, ${formatPct(coldest.overRate)} over).`,
    explainer: `League average combined score is about ${meta.leagueAvgTotal}. The hot pair runs ${(hottest.avgTotal - meta.leagueAvgTotal).toFixed(1)} above that; the cold pair ${(coldest.avgTotal - meta.leagueAvgTotal).toFixed(1)} below — a ${gap.toFixed(1)}-point canyon between ref–team environments in the same dataset. Totals aren't a single league temperature; who's reffing and who's playing moves the needle dramatically.`,
    stats: [
      {
        label: "Hottest avg",
        value: String(hottest.avgTotal),
        detail: `${hottest.ref.name} · ${hottest.team}`,
      },
      {
        label: "Coldest avg",
        value: String(coldest.avgTotal),
        detail: `${coldest.ref.name} · ${coldest.team}`,
      },
      {
        label: "Gap",
        value: gap.toFixed(1),
        detail: `vs ${meta.leagueAvgTotal} league avg`,
      },
    ],
    sampleNote: `Min ${minGames} games per ref–team pair · ${meta.seasons.join(", ")}`,
    links: [
      { label: hottest.ref.name, href: `/refs/${hottest.ref.slug}` },
      { label: hotTeam, href: `/teams/${hottest.team}` },
      { label: coldest.ref.name, href: `/refs/${coldest.ref.slug}` },
      { label: coldTeam, href: `/teams/${coldest.team}` },
    ],
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
    rareOverRefsFinding(stats),
    overRateTeamSplitFinding(stats),
    foulEdgeLosingFinding(stats),
    scoringExtremesFinding(stats),
    crossTeamWhistleFinding(stats, refTeams),
  ];
}
