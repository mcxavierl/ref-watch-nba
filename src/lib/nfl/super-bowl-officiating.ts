import * as fs from "node:fs";
import * as path from "node:path";
import bundled from "../../../data/nfl/super-bowl-officiating.json";
import type { Finding } from "@/lib/findings-shared";
import { resolveFindingExplainer } from "@/lib/findings-shared";
import { getRefStats } from "@/lib/nfl/data";
import { getTeam, teamFullName } from "@/lib/nfl/teams";

export type SuperBowlGame = {
  number: number;
  roman: string;
  season: string;
  date: string;
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  referee: string;
  overtime?: boolean;
  totalPenalties?: number;
  penaltySource?: string;
};

export type SuperBowlCatalog = {
  generatedAt: string;
  source: string;
  note: string;
  games: SuperBowlGame[];
};

export type ResolvedSuperBowlGame = SuperBowlGame & {
  totalPoints: number;
  margin: number;
  refereeSlug: string | null;
  winnerLabel: string;
  loserLabel: string;
};

function readCatalog(): SuperBowlCatalog {
  try {
    const disk = path.join(
      process.cwd(),
      "data",
      "nfl",
      "super-bowl-officiating.json",
    );
    if (fs.existsSync(disk)) {
      return JSON.parse(fs.readFileSync(disk, "utf8")) as SuperBowlCatalog;
    }
  } catch {
    /* bundled fallback */
  }
  return bundled as SuperBowlCatalog;
}

function teamLabel(abbr: string): string {
  const team = getTeam(abbr);
  return team ? teamFullName(team) : abbr;
}

function resolveRefereeSlug(name: string): string | null {
  const stats = getRefStats();
  const exact = stats.refs.find((ref) => ref.name === name);
  if (exact) return exact.slug;
  const loose = stats.refs.find(
    (ref) => ref.name.toLowerCase() === name.toLowerCase(),
  );
  return loose?.slug ?? null;
}

export function getSuperBowlCatalog(): SuperBowlCatalog {
  return readCatalog();
}

export function resolveSuperBowlGames(): ResolvedSuperBowlGame[] {
  const catalog = readCatalog();
  return catalog.games.map((game) => ({
    ...game,
    totalPoints: game.winnerScore + game.loserScore,
    margin: game.winnerScore - game.loserScore,
    refereeSlug: resolveRefereeSlug(game.referee),
    winnerLabel: teamLabel(game.winner),
    loserLabel: teamLabel(game.loser),
  }));
}

function refLink(slug: string | null, name: string): Finding["links"] {
  if (!slug) return [];
  return [{ label: name, href: `/nfl/refs/${slug}` }];
}

function sbExplainer(text: string): string {
  return resolveFindingExplainer(text);
}

/** Ranked Super Bowl officiating findings for insights and home pages. */
export function computeSuperBowlFindings(limit = 6): Finding[] {
  const catalog = readCatalog();
  const games = resolveSuperBowlGames();
  if (games.length === 0) return [];

  const leagueAvg = getRefStats().meta.leagueAvgTotal;
  const leagueAvgFlags = getRefStats().meta.leagueAvgFouls;
  const findings: Finding[] = [];

  const penaltyGames = games.filter((g) => g.totalPenalties !== undefined);
  const highestPenalties =
    penaltyGames.length > 0
      ? [...penaltyGames].sort(
          (a, b) => (b.totalPenalties ?? 0) - (a.totalPenalties ?? 0),
        )[0]!
      : null;
  const lowestPenalties =
    penaltyGames.length > 0
      ? [...penaltyGames].sort(
          (a, b) => (a.totalPenalties ?? 0) - (b.totalPenalties ?? 0),
        )[0]!
      : null;

  const highest = [...games].sort((a, b) => b.totalPoints - a.totalPoints)[0]!;
  const lowest = [...games].sort((a, b) => a.totalPoints - b.totalPoints)[0]!;
  const widest = [...games].sort((a, b) => b.margin - a.margin)[0]!;
  const otGame = games.find((g) => g.overtime);

  const refCounts = new Map<string, { name: string; slug: string | null; count: number }>();
  for (const game of games) {
    const row = refCounts.get(game.referee) ?? {
      name: game.referee,
      slug: game.refereeSlug,
      count: 0,
    };
    row.count += 1;
    refCounts.set(game.referee, row);
  }
  const repeatLeader = [...refCounts.values()].sort((a, b) => b.count - a.count)[0]!;
  const latest = games[games.length - 1]!;

  const scoringDeltaHigh = highest.totalPoints - leagueAvg;
  const scoringDeltaLow = lowest.totalPoints - leagueAvg;

  if (highestPenalties && highestPenalties.totalPenalties !== undefined) {
    const flagDelta = highestPenalties.totalPenalties - leagueAvgFlags;
    findings.push({
      id: "nfl-sb-most-penalties",
      category: "whistle-extreme",
      headline:
        flagDelta >= 0
          ? `Super Bowl ${highestPenalties.roman} had ${highestPenalties.totalPenalties} flags, ${flagDelta.toFixed(0)} above regular-season pace`
          : `Super Bowl ${highestPenalties.roman} ran ${highestPenalties.totalPenalties} total penalties`,
      summary: `${highestPenalties.winnerLabel} ${highestPenalties.winnerScore}–${highestPenalties.loserScore} ${highestPenalties.loserLabel}. ${highestPenalties.referee} refereed.`,
      explainer: sbExplainer(
        "Title-game penalty volume reflects crew tightness and game flow. Useful context when comparing championship flags to regular-season benchmarks.",
      ),
      stats: [
        {
          label: "Total penalties",
          value: String(highestPenalties.totalPenalties),
          detail: `vs ${leagueAvgFlags.toFixed(1)} reg-season avg`,
        },
        {
          label: "Referee",
          value: highestPenalties.referee,
          detail: `SB ${highestPenalties.roman}`,
        },
      ],
      sampleNote: `Sample: ${penaltyGames.length} Super Bowls with penalty data`,
      links: refLink(highestPenalties.refereeSlug, highestPenalties.referee),
    });
  }

  if (
    lowestPenalties &&
    lowestPenalties.totalPenalties !== undefined &&
    lowestPenalties.number !== highestPenalties?.number
  ) {
    const flagDelta = lowestPenalties.totalPenalties - leagueAvgFlags;
    findings.push({
      id: "nfl-sb-fewest-penalties",
      category: "whistle-extreme",
      headline:
        flagDelta < 0
          ? `Fewest flags in sample: Super Bowl ${lowestPenalties.roman} (${lowestPenalties.totalPenalties})`
          : `Super Bowl ${lowestPenalties.roman} stayed near league flag pace`,
      summary: `${lowestPenalties.winnerLabel} ${lowestPenalties.winnerScore}–${lowestPenalties.loserScore} ${lowestPenalties.loserLabel}. ${lowestPenalties.referee} refereed.`,
      explainer: sbExplainer(
        "Low-penalty Super Bowls often feature clean play or a crew that lets the game breathe. Compare to regular-season flag averages, not betting markets.",
      ),
      stats: [
        {
          label: "Total penalties",
          value: String(lowestPenalties.totalPenalties),
          detail: `vs ${leagueAvgFlags.toFixed(1)} reg-season avg`,
        },
        {
          label: "Referee",
          value: lowestPenalties.referee,
          detail: `SB ${lowestPenalties.roman}`,
        },
      ],
      sampleNote: `Sample: ${penaltyGames.length} Super Bowls with penalty data`,
      links: refLink(lowestPenalties.refereeSlug, lowestPenalties.referee),
    });
  }

  findings.push({
    id: "nfl-sb-highest-scoring",
    category: "scoring-extreme",
    headline:
      scoringDeltaHigh >= 0
        ? `Super Bowl ${highest.roman} ran ${scoringDeltaHigh.toFixed(0)} points above league pace`
        : `Super Bowl ${highest.roman} finished ${Math.abs(scoringDeltaHigh).toFixed(0)} points below league pace`,
    summary: `${highest.winnerLabel} ${highest.winnerScore}–${highest.loserScore} ${highest.loserLabel} (${highest.totalPoints} combined). ${highest.referee} refereed.`,
    explainer: sbExplainer(
      `Highest-scoring title game in the ${catalog.games.length}-game sample (${catalog.source}). Championship games often compress pace, so a high total is a real outlier for totals markets.`,
    ),
    stats: [
      {
        label: "Total points",
        value: String(highest.totalPoints),
        detail: `vs ${leagueAvg.toFixed(1)} reg-season avg`,
      },
      {
        label: "Referee",
        value: highest.referee,
        detail: `SB ${highest.roman}`,
      },
    ],
    sampleNote: `Sample: ${games.length} Super Bowls (2000–present)`,
    links: refLink(highest.refereeSlug, highest.referee),
  });

  findings.push({
    id: "nfl-sb-lowest-scoring",
    category: "scoring-extreme",
    headline:
      scoringDeltaLow < 0
        ? `Super Bowl ${lowest.roman} landed ${Math.abs(scoringDeltaLow).toFixed(0)} points under league average`
        : `Super Bowl ${lowest.roman} tracked near league scoring pace`,
    summary: `${lowest.winnerLabel} ${lowest.winnerScore}–${lowest.loserScore} ${lowest.loserLabel} (${lowest.totalPoints} combined). ${lowest.referee} refereed.`,
    explainer: sbExplainer(
      "Low-scoring Super Bowls stress defensive game plans and clock-killing drives. Useful context when comparing title-game totals to regular-season benchmarks.",
    ),
    stats: [
      {
        label: "Total points",
        value: String(lowest.totalPoints),
        detail: `vs ${leagueAvg.toFixed(1)} reg-season avg`,
      },
      {
        label: "Referee",
        value: lowest.referee,
        detail: `SB ${lowest.roman}`,
      },
    ],
    sampleNote: `Sample: ${games.length} Super Bowls (2000–present)`,
    links: refLink(lowest.refereeSlug, lowest.referee),
  });

  if (repeatLeader.count >= 2) {
    findings.push({
      id: "nfl-sb-repeat-referee",
      category: "ref-outlier",
      headline: `${repeatLeader.name} leads modern Super Bowl assignments (${repeatLeader.count} games)`,
      summary: `${repeatLeader.name} has refereed ${repeatLeader.count} of ${games.length} Super Bowls since 2000, the most in this span.`,
      explainer: sbExplainer(
        "The NFL grades officials all season, then slots the highest-rated referee into the Super Bowl. Repeat assignments signal sustained crew performance, not random rotation.",
      ),
      stats: [
        {
          label: "SB assignments",
          value: String(repeatLeader.count),
          detail: `of ${games.length} games`,
        },
        {
          label: "Span",
          value: "2000–now",
          detail: "Curated catalog",
        },
      ],
      sampleNote: `Sample: ${games.length} Super Bowls (2000–present)`,
      links: refLink(repeatLeader.slug, repeatLeader.name),
    });
  }

  findings.push({
    id: "nfl-sb-widest-margin",
    category: "league-trend",
    headline: `Widest margin since 2000: ${widest.winnerLabel} by ${widest.margin} in Super Bowl ${widest.roman}`,
    summary: `${widest.winnerLabel} ${widest.winnerScore}–${widest.loserScore} ${widest.loserLabel}. Crew led by ${widest.referee}.`,
    explainer: sbExplainer(
      "Blowout Super Bowls often see fewer late-game pressure penalties as teams abandon structure. Margin context helps separate competitive vs. one-sided title games.",
    ),
    stats: [
      {
        label: "Margin",
        value: `${widest.margin} pts`,
        detail: `SB ${widest.roman}`,
      },
      {
        label: "Total points",
        value: String(widest.totalPoints),
        detail: `${widest.winner} over ${widest.loser}`,
      },
    ],
    sampleNote: `Sample: ${games.length} Super Bowls (2000–present)`,
    links: refLink(widest.refereeSlug, widest.referee),
  });

  if (otGame) {
    findings.push({
      id: "nfl-sb-overtime",
      category: "league-trend",
      headline: `Super Bowl ${otGame.roman} is the only overtime title game in this sample`,
      summary: `${otGame.winnerLabel} ${otGame.winnerScore}–${otGame.loserScore} ${otGame.loserLabel} in OT. ${otGame.referee} refereed.`,
      explainer: sbExplainer(
        "Overtime Super Bowls extend snaps and can add late flags as fatigue sets in. A unique officiating environment compared with regulation-only title games.",
      ),
      stats: [
        {
          label: "Final total",
          value: String(otGame.totalPoints),
          detail: "Regulation + OT",
        },
        {
          label: "Referee",
          value: otGame.referee,
          detail: `SB ${otGame.roman}`,
        },
      ],
      sampleNote: `Sample: ${games.length} Super Bowls (2000–present)`,
      links: refLink(otGame.refereeSlug, otGame.referee),
    });
  }

  findings.push({
    id: "nfl-sb-latest",
    category: "ref-outlier",
    headline: `Super Bowl ${latest.roman}: ${latest.referee} in the referee chair`,
    summary: `${latest.winnerLabel} ${latest.winnerScore}–${latest.loserScore} ${latest.loserLabel} (${latest.date}).`,
    explainer: sbExplainer(
      "Each Super Bowl crew is hand-picked from the season's top-graded officials. The referee assignment is the headline role for pace-of-play and penalty enforcement.",
    ),
    stats: [
      {
        label: "Total points",
        value: String(latest.totalPoints),
        detail: `vs ${leagueAvg.toFixed(1)} reg-season avg`,
      },
      {
        label: "Season",
        value: latest.season,
        detail: `SB ${latest.roman}`,
      },
    ],
    sampleNote: `Sample: ${games.length} Super Bowls (2000–present)`,
    links: refLink(latest.refereeSlug, latest.referee),
  });

  return findings.slice(0, limit);
}

export function superBowlCatalogMeta(): {
  gameCount: number;
  source: string;
  note: string;
} {
  const catalog = readCatalog();
  return {
    gameCount: catalog.games.length,
    source: catalog.source,
    note: catalog.note,
  };
}
