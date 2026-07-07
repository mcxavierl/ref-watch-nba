#!/usr/bin/env npx tsx
/** Fetch current-season PP/PK by team from NHL stats API. */
import * as fs from "node:fs";
import * as path from "node:path";

const NHL_TEAM_ABBRS = [
  "ANA", "BOS", "BUF", "CAR", "CBJ", "CGY", "CHI", "COL", "DAL", "DET",
  "EDM", "FLA", "LAK", "MIN", "MTL", "NSH", "NJD", "NYI", "NYR", "OTT",
  "PHI", "PIT", "SEA", "SJS", "STL", "TBL", "TOR", "UTA", "VAN", "VGK",
  "WPG", "WSH",
];

const TRI_TO_ABBR: Record<string, string> = {
  ANA: "ANA",
  BOS: "BOS",
  BUF: "BUF",
  CAR: "CAR",
  CBJ: "CBJ",
  CGY: "CGY",
  CHI: "CHI",
  COL: "COL",
  DAL: "DAL",
  DET: "DET",
  EDM: "EDM",
  FLA: "FLA",
  LAK: "LAK",
  MIN: "MIN",
  MTL: "MTL",
  NSH: "NSH",
  NJD: "NJD",
  NYI: "NYI",
  NYR: "NYR",
  OTT: "OTT",
  PHI: "PHI",
  PIT: "PIT",
  SEA: "SEA",
  SJS: "SJS",
  STL: "STL",
  TBL: "TBL",
  TOR: "TOR",
  UTA: "UTA",
  VAN: "VAN",
  VGK: "VGK",
  WPG: "WPG",
  WSH: "WSH",
};

interface TeamSummaryRow {
  teamTriCode?: string;
  powerPlayPct?: number;
  penaltyKillPct?: number;
}

function currentSeasonId(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  if (month >= 10) return year * 10000 + (year + 1);
  return (year - 1) * 10000 + year;
}

async function fetchTeamSpecialTeams(): Promise<
  Record<string, { ppPct: number; pkPct: number }>
> {
  const seasonId = currentSeasonId();
  const url = new URL("https://api.nhle.com/stats/rest/en/team/summary");
  url.searchParams.set("isAggregate", "false");
  url.searchParams.set("limit", "50");
  url.searchParams.set(
    "cayenneExp",
    `seasonId=${seasonId} and gameTypeId=2`,
  );

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`NHL stats API ${res.status}`);
  const body = (await res.json()) as { data: TeamSummaryRow[] };
  const out: Record<string, { ppPct: number; pkPct: number }> = {};

  for (const row of body.data ?? []) {
    const tri = row.teamTriCode?.toUpperCase();
    if (!tri) continue;
    const abbr = TRI_TO_ABBR[tri] ?? tri;
    if (!NHL_TEAM_ABBRS.includes(abbr)) continue;
    out[abbr] = {
      ppPct: row.powerPlayPct ?? 0.22,
      pkPct: row.penaltyKillPct ?? 0.78,
    };
  }

  for (const abbr of NHL_TEAM_ABBRS) {
    if (!out[abbr]) {
      out[abbr] = { ppPct: 0.22, pkPct: 0.78 };
    }
  }

  return out;
}

async function main() {
  const outPath = path.join(process.cwd(), "data", "nhl", "team-special-teams.json");
  console.log("Fetching NHL team PP/PK...");
  const data = await fetchTeamSpecialTeams();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        seasonId: currentSeasonId(),
        teams: data,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${Object.keys(data).length} teams to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
