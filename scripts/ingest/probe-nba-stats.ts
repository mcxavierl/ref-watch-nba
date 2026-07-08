#!/usr/bin/env npx tsx
import { fetchGameSummary, fetchSeasonGameIds } from "./fetch-nba-stats";

async function main() {
  const ids = await fetchSeasonGameIds("2021-22");
  console.log("ids", ids.length, ids[0]);

  const { NBA_STATS_HEADERS } = await import("../lib/nba-headers");
  const url = `https://stats.nba.com/stats/boxscoresummaryv2?GameID=${ids[0]}`;
  const res = await fetch(url, { headers: NBA_STATS_HEADERS });
  const data = (await res.json()) as {
    resultSets: { name: string; headers: string[]; rowSet: unknown[][] }[];
  };
  console.log("sets", data.resultSets.map((r) => r.name));
  const gi = data.resultSets.find((r) => r.name === "GameInfo");
  console.log("gameinfo", gi?.headers, gi?.rowSet?.[0]);
  const off = data.resultSets.find((r) => r.name === "Officials");
  console.log("officials", off?.headers, off?.rowSet?.slice(0, 3));

  for (const id of ids.slice(0, 5)) {
    const s = await fetchGameSummary(id);
    console.log(
      id,
      "status",
      s?.httpStatus,
      "date",
      s?.date,
      "teams",
      s?.awayTeam,
      "@",
      s?.homeTeam,
      s?.awayScore,
      "-",
      s?.homeScore,
      "officials",
      s?.officials?.length,
      s?.officials?.map((o) => o.name).join(", "),
    );
  }
}

main().catch(console.error);
