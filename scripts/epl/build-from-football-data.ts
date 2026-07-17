#!/usr/bin/env npx tsx
/**
 * Build verified EPL referee data from football-data.co.uk.
 *
 * ESPN only lists officials for ~2 recent seasons, leaving 2017–2022 mostly
 * empty and double-listing some referees (full + abbreviated name in the same
 * game). football-data.co.uk provides complete match data for every Premier
 * League season — referee, fouls, cards, goals, and over/under 2.5 odds — from
 * a single consistent source, so we rebuild from it end to end.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  TeamCrewSplit,
} from "../../src/lib/types";
import { EPL_TEAM_ABBRS } from "../../src/lib/epl/teams";
import { refSlug } from "../lib/slug";
import {
  canonicalRefKey,
  chooseRefIdentity,
  displayNameForKey,
  type RefVariant,
} from "../lib/ref-identity";
import { dedupeRefsInPlace } from "../lib/merge-duplicate-refs";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../lib/ref-team-stats";
import {
  computeEplRefAnalytics,
  computeLeagueAvgYellow,
  computeLeagueAvgRed,
  computeLeagueAvgPenalties,
  type EplGameCardStats,
} from "./lib/ref-analytics";

const DATA_DIR = path.join(process.cwd(), "data", "epl");
const CSV_DIR = path.join(DATA_DIR, "football-data");
const MIN_SAMPLE = 30;
const OVER_UNDER_LINE = 2.5; // Standard EPL total-goals market.
const LEAGUE_OVER_BASELINE = 0.5;

/** football-data season codes → season labels. */
const SEASON_CODES = [
  "1617", "1718", "1819", "1920", "2021",
  "2122", "2223", "2324", "2425", "2526",
];

function seasonLabel(code: string): string {
  return `20${code.slice(0, 2)}-${code.slice(2)}`;
}

/** football-data team names → app abbreviations (all clubs 2016–2026). */
const TEAM_MAP: Record<string, string> = {
  Arsenal: "ARS", "Aston Villa": "AVL", Bournemouth: "BOU", Brentford: "BRE",
  Brighton: "BHA", Burnley: "BUR", Cardiff: "CAR", Chelsea: "CHE",
  "Crystal Palace": "CRY", Everton: "EVE", Fulham: "FUL", Huddersfield: "HUD",
  Hull: "HUL", Ipswich: "IPS", Leeds: "LEE", Leicester: "LEI", Liverpool: "LIV",
  Luton: "LTN", "Man City": "MCI", "Man United": "MUN", Middlesbrough: "MID",
  Newcastle: "NEW", Norwich: "NOR", "Nott'm Forest": "NFO",
  "Sheffield United": "SHU", Southampton: "SOU", Stoke: "STK", Sunderland: "SUN",
  Swansea: "SWA", Tottenham: "TOT", Watford: "WAT", "West Brom": "WBA",
  "West Ham": "WHU", Wolves: "WOL",
};

/**
 * Curated full names for football-data's abbreviated referee forms. Only
 * high-confidence Premier League officials; anything unlisted keeps the
 * abbreviated form rather than risk a wrong name.
 */
const REF_FULL_NAMES: Record<string, string> = {
  "a taylor": "Anthony Taylor", "m oliver": "Michael Oliver",
  "c pawson": "Craig Pawson", "s attwell": "Stuart Attwell",
  "c kavanagh": "Chris Kavanagh", "p tierney": "Paul Tierney",
  "m atkinson": "Martin Atkinson", "a marriner": "Andre Marriner",
  "m dean": "Mike Dean", "j moss": "Jonathan Moss", "s hooper": "Simon Hooper",
  "k friend": "Kevin Friend", "g scott": "Graham Scott", "r jones": "Robert Jones",
  "d coote": "David Coote", "j brooks": "John Brooks", "t robinson": "Tim Robinson",
  "p bankes": "Peter Bankes", "d england": "Darren England", "l mason": "Lee Mason",
  "m salisbury": "Michael Salisbury", "a madley": "Andy Madley",
  "r madley": "Robert Madley", "n swarbrick": "Neil Swarbrick",
  "m clattenburg": "Mark Clattenburg", "r east": "Roger East",
  "j gillett": "Jarred Gillett", "s barrott": "Sam Barrott", "d bond": "Darren Bond",
  "j smith": "Josh Smith", "t harrington": "Tony Harrington", "t bramall": "Tom Bramall",
  "o langford": "Oliver Langford", "l probert": "Lee Probert", "b jones": "Bobby Jones",
  "l smith": "Lee Smith", "g eltringham": "Geoff Eltringham",
  "d webb": "David Webb", "s martin": "Stephen Martin", "m jones": "Mike Jones",
  "r welch": "Rebecca Welch", "s allison": "Sam Allison",
};

function initialSurnameKey(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.toLowerCase();
  return `${parts[0][0].toLowerCase()} ${parts[parts.length - 1].toLowerCase()}`;
}

function resolveRefName(fdName: string): string {
  return REF_FULL_NAMES[initialSurnameKey(fdName)] ?? fdName.trim();
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function parseDate(raw: string): string {
  const [d, m, y] = raw.split("/");
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const headers = lines[0].split(",");
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    if (row.HomeTeam) rows.push(row);
  }
  return rows;
}

type EplRecord = RefGameRecord & EplGameCardStats;

interface EplGameLog extends EplRecord {
  league: "EPL";
  homeScore: number;
  awayScore: number;
  homeFouls: number;
  awayFouls: number;
  closingTotal: number;
  homeSpread: number;
  lineSource: "external" | "synthetic";
  officials: { name: string; number: number; role: "referee" }[];
}

async function main() {
  const refGames = new Map<string, EplRecord[]>();
  const refIdentities = new Map<string, Map<number, RefVariant>>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByRef = new Map<string, Map<string, TeamGameRow[]>>();
  const gameLogs: EplGameLog[] = [];
  const allDates: string[] = [];
  let skipped = 0;

  for (const code of SEASON_CODES) {
    const file = path.join(CSV_DIR, `E0_${code}.csv`);
    if (!fs.existsSync(file)) {
      console.warn(`Missing ${file} — run the fetch step first.`);
      continue;
    }
    const rows = parseCsv(fs.readFileSync(file, "utf8"));
    const season = seasonLabel(code);
    let used = 0;

    for (const row of rows) {
      const home = TEAM_MAP[row.HomeTeam];
      const away = TEAM_MAP[row.AwayTeam];
      const refRaw = row.Referee?.trim();
      if (!home || !away || !refRaw) {
        skipped++;
        continue;
      }
      const date = parseDate(row.Date);
      const homeScore = Number(row.FTHG);
      const awayScore = Number(row.FTAG);
      const homeFouls = Number(row.HF) || 0;
      const awayFouls = Number(row.AF) || 0;
      const homeYellow = Number(row.HY) || 0;
      const awayYellow = Number(row.AY) || 0;
      const homeRed = Number(row.HR) || 0;
      const awayRed = Number(row.AR) || 0;
      if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
        skipped++;
        continue;
      }
      const totalPoints = homeScore + awayScore;
      const totalFouls = homeFouls + awayFouls;
      const overHit = totalPoints > OVER_UNDER_LINE;
      const name = resolveRefName(refRaw);
      const gameId = `${date}-${home}-${away}`;

      const record: EplRecord = {
        gameId,
        date,
        season,
        homeTeam: home,
        awayTeam: away,
        totalPoints,
        totalFouls,
        overHit,
        raptorsInvolved: false,
        homeYellowCards: homeYellow,
        awayYellowCards: awayYellow,
        homeRedCards: homeRed,
        awayRedCards: awayRed,
        homePenalties: 0,
        awayPenalties: 0,
      };

      const refKey = canonicalRefKey(name);
      const variants = refIdentities.get(refKey) ?? new Map<number, RefVariant>();
      const variant =
        variants.get(0) ?? { name, number: 0, games: 0, lastDate: "" };
      variant.games += 1;
      if (date >= variant.lastDate) {
        variant.lastDate = date;
        variant.name = name;
      }
      variants.set(0, variant);
      refIdentities.set(refKey, variants);

      const list = refGames.get(refKey) ?? [];
      list.push(record);
      refGames.set(refKey, list);

      const homeWin = homeScore > awayScore;
      const awayWin = awayScore > homeScore;
      for (const [teamAbbr, isHome] of [[home, true], [away, false]] as const) {
        pushRefTeamGame(refTeamBuckets, refKey, teamAbbr, {
          foulDifferential: isHome ? homeFouls - awayFouls : awayFouls - homeFouls,
          totalPoints,
          overHit,
          teamWin: isHome ? homeWin : awayWin,
        });
        const teamRows = teamByRef.get(teamAbbr) ?? new Map<string, TeamGameRow[]>();
        const crewRows = teamRows.get(refKey) ?? [];
        crewRows.push({
          totalPoints,
          totalFouls,
          overHit,
          teamFouls: isHome ? homeFouls : awayFouls,
          opponentFouls: isHome ? awayFouls : homeFouls,
          teamWin: isHome ? homeWin : awayWin,
          isHome,
        });
        teamRows.set(refKey, crewRows);
        teamByRef.set(teamAbbr, teamRows);
      }

      gameLogs.push({
        ...record,
        league: "EPL",
        homeScore,
        awayScore,
        homeFouls,
        awayFouls,
        closingTotal: OVER_UNDER_LINE,
        homeSpread: 0,
        lineSource: "external",
        officials: [{ name, number: 0, role: "referee" }],
      });
      allDates.push(date);
      used++;
    }
    console.log(`  ${season}: ${used} games`);
  }

  const allRecords = [...refGames.values()].flat();
  const leagueAvgTotal =
    allRecords.reduce((s, g) => s + g.totalPoints, 0) / allRecords.length;
  const leagueAvgFouls =
    allRecords.reduce((s, g) => s + g.totalFouls, 0) / allRecords.length;
  const leagueAvgYellow = computeLeagueAvgYellow(allRecords);
  const leagueAvgRed = computeLeagueAvgRed(allRecords);
  const leagueAvgPenalties = computeLeagueAvgPenalties(allRecords);

  const refs: RefProfile[] = [];
  for (const [refKey, games] of refGames) {
    const identity = chooseRefIdentity(refIdentities.get(refKey)!.values());
    const name = displayNameForKey(refKey, identity.name);
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
    const recentGames = [...games]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    refs.push({
      slug: refSlug(name, 0),
      name,
      number: 0,
      games: games.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons: [...new Set(games.map((g) => g.season))].sort(),
      recentGames,
      teamStats: collectRefTeamStats(refTeamBuckets.get(refKey) ?? new Map()),
      eplAnalytics: computeEplRefAnalytics(
        games,
        leagueAvgTotal,
        leagueAvgFouls,
        leagueAvgYellow,
        leagueAvgRed,
        leagueAvgPenalties,
      ),
    });
  }
  refs.sort((a, b) => b.games - a.games);
  dedupeRefsInPlace(refs, leagueAvgTotal, leagueAvgFouls);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  const refNameByKey = new Map(
    refs.map((r) => [canonicalRefKey(r.name), r.name] as const),
  );
  const allTeams = new Set<string>([...EPL_TEAM_ABBRS, ...teamByRef.keys()]);
  for (const abbr of allTeams) {
    const byRef = teamByRef.get(abbr);
    if (!byRef || byRef.size === 0) continue;
    teamSplits[abbr] = [...byRef.entries()]
      .map(([refKey, rows]) =>
        buildTeamSplit(
          refKey,
          [refNameByKey.get(refKey) ?? refKey],
          rows,
          leagueAvgTotal,
        ),
      )
      .sort((a, b) => b.games - a.games);
  }

  allDates.sort();
  const stats: RefStatsFile = {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: SEASON_CODES.map(seasonLabel),
      leagueAvgTotal: round1(leagueAvgTotal),
      leagueAvgFouls: round1(leagueAvgFouls),
      leagueOverBaseline: LEAGUE_OVER_BASELINE,
      minSampleSize: MIN_SAMPLE,
      source: "football-data",
      data_verified: true,
      data_source: "football-data.co.uk",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: allRecords.length,
      dateRange: { earliest: allDates[0], latest: allDates[allDates.length - 1] },
      note:
        `Goals, fouls, and cards from football-data.co.uk match archives ` +
        `(${allRecords.length} games, ${SEASON_CODES.length} seasons). ` +
        `Over/under vs the ${OVER_UNDER_LINE}-goal line. ${skipped} rows skipped.`,
    },
    refs,
    teamSplits,
  };

  fs.writeFileSync(
    path.join(DATA_DIR, "ref-stats.json"),
    `${JSON.stringify(stats, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "game-logs.json"),
    `${JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        league: "EPL",
        source: "football-data.co.uk",
        games: gameLogs.sort(
          (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
        ),
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `\nBuilt ${refs.length} EPL referees from ${allRecords.length} games ` +
      `(${skipped} skipped). leagueAvgGoals=${round1(leagueAvgTotal)}, ` +
      `leagueAvgFouls=${round1(leagueAvgFouls)}`,
  );
}

interface TeamGameRow {
  totalPoints: number;
  totalFouls: number;
  overHit: boolean;
  teamFouls: number;
  opponentFouls: number;
  teamWin: boolean;
  isHome: boolean;
}

function buildTeamSplit(
  key: string,
  crewNames: string[],
  games: TeamGameRow[],
  leagueAvgTotal: number,
): TeamCrewSplit {
  const n = games.length;
  const wins = games.filter((g) => g.teamWin).length;
  const homeGames = games.filter((g) => g.isHome);
  const awayGames = games.filter((g) => !g.isHome);
  const avgTeamFouls = games.reduce((s, g) => s + g.teamFouls, 0) / n;
  const avgOpponentFouls = games.reduce((s, g) => s + g.opponentFouls, 0) / n;
  return {
    crewKey: key,
    crewNames,
    games: n,
    avgTotalPoints: round1(games.reduce((s, g) => s + g.totalPoints, 0) / n),
    overRate: round3(games.filter((g) => g.overHit).length / n),
    avgFouls: round1(games.reduce((s, g) => s + g.totalFouls, 0) / n),
    wins,
    losses: n - wins,
    totalDelta: round1(games.reduce((s, g) => s + g.totalPoints, 0) / n - leagueAvgTotal),
    homeGames: homeGames.length,
    awayGames: awayGames.length,
    homeWins: homeGames.filter((g) => g.teamWin).length,
    homeLosses: homeGames.filter((g) => !g.teamWin).length,
    awayWins: awayGames.filter((g) => g.teamWin).length,
    awayLosses: awayGames.filter((g) => !g.teamWin).length,
    avgTeamFouls: round1(avgTeamFouls),
    avgOpponentFouls: round1(avgOpponentFouls),
    foulDifferential: round1(avgTeamFouls - avgOpponentFouls),
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
