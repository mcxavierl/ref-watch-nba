import assert from "node:assert/strict";
import { test } from "node:test";
import { computeFindings as computeNbaFindings } from "@/lib/findings";
import { computeFindings as computeNhlFindings } from "@/lib/nhl/findings";
import { computeFindings as computeNflFindings } from "@/lib/nfl/findings";
import { computeFindings as computeEplFindings } from "@/lib/epl/findings";
import { computeFindings as computeLaligaFindings } from "@/lib/laliga/findings";
import { computeFindings as computeCbbFindings } from "@/lib/cbb/findings";
import { computeFindings as computeCfbFindings } from "@/lib/cfb/findings";
import { buildRankingsSynthesis, MAX_RANKINGS_HIGHLIGHT_CARDS } from "@/lib/rankings-synthesis";
import { LEAGUES } from "@/lib/leagues";
import { loadLeagueStats } from "@/lib/load-league-stats";

const MIN_HUB_FINDINGS = 6;
const LIVE_LEAGUES = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
] as const;

const FINDING_COMPUTERS = {
  nba: computeNbaFindings,
  nhl: computeNhlFindings,
  nfl: computeNflFindings,
  epl: computeEplFindings,
  laliga: computeLaligaFindings,
  cbb: computeCbbFindings,
  cfb: computeCfbFindings,
} as const;

test("each live league returns at least six hub findings", () => {
  for (const leagueId of LIVE_LEAGUES) {
    const findings = FINDING_COMPUTERS[leagueId](MIN_HUB_FINDINGS, undefined, {
      hub: true,
    });
    assert.ok(
      findings.length >= MIN_HUB_FINDINGS,
      `${leagueId} hub findings: expected >= ${MIN_HUB_FINDINGS}, got ${findings.length}`,
    );
  }
});

test("each live league returns at least six tendency highlight cards when data allows", () => {
  for (const leagueId of LIVE_LEAGUES) {
    const { stats } = loadLeagueStats(leagueId);
    const synthesis = buildRankingsSynthesis(stats, LEAGUES[leagueId], {
      maxCards: MAX_RANKINGS_HIGHLIGHT_CARDS,
    });
    if (stats.refs.length === 0) continue;
    assert.ok(
      synthesis.insights.length >= MIN_HUB_FINDINGS,
      `${leagueId} tendencies: expected >= ${MIN_HUB_FINDINGS}, got ${synthesis.insights.length}`,
    );
  }
});
