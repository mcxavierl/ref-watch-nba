import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRefStats, getTeamSplits } from "@/lib/epl/data";
import { getTeam, teamFullName, EPL_TEAMS } from "@/lib/epl/teams";
import { buildMarqueeEfficiencyFinding, type LeagueFindingContext } from "@/lib/findings-builders";
import {
  computeRefMarqueePerformance,
  passesMarqueeComparisonGate,
  scanLeagueMarqueeEfficiency,
} from "@/lib/marquee-metrics";
import { isPromotableFinding } from "@/lib/findings-significance";
import {
  filterDisplayStats,
  isActionableComparisonStat,
} from "@/lib/findings-shared";

const EPL_FINDING_CTX: LeagueFindingContext = {
  league: "EPL",
  paths: {
    idPrefix: "epl-",
    refsBrowsePath: "/epl/refs",
    refPath: (slug) => `/epl/refs/${slug}`,
    teamPath: (abbr) => `/epl/teams/${abbr}`,
    matrixPath: "/epl/matrix",
    crewsPath: "/epl/crews",
    trendsPath: "/epl/trends",
  },
  labels: {
    scoreUnit: "goals",
    whistleUnit: "fouls",
    teamName: (abbr) => {
      const team = getTeam(abbr);
      return team ? teamFullName(team) : abbr;
    },
  },
  getTeamSplits,
  teams: EPL_TEAMS.map((team) => ({
    abbr: team.abbr,
    label: teamFullName(team),
    name: team.name,
  })),
};

describe("marquee efficiency finding gates", () => {
  it("blocks Josh Smith when every game is marquee (zero baseline arm)", () => {
    const stats = getRefStats();
    const josh = stats.refs.find((ref) => ref.slug === "josh-smith-0");
    assert.ok(josh);

    const performance = computeRefMarqueePerformance("epl", josh);
    assert.ok(performance);
    assert.equal(performance.marqueeGames, 8);
    assert.equal(performance.baselineGames, 0);
    assert.equal(passesMarqueeComparisonGate(performance), false);
    assert.equal(scanLeagueMarqueeEfficiency("epl", stats.refs), null);
    assert.equal(buildMarqueeEfficiencyFinding(stats, EPL_FINDING_CTX), null);
  });

  it("drops zero-sample comparison stat cells from display", () => {
    assert.equal(
      isActionableComparisonStat({
        label: "Baseline over rate",
        value: "0.0%",
        detail: "0 non-marquee games",
      }),
      false,
    );

    const filtered = filterDisplayStats([
      {
        label: "Marquee over rate",
        value: "75.0%",
        detail: "8 marquee games · vs 0.0% baseline",
      },
      {
        label: "Baseline over rate",
        value: "0.0%",
        detail: "0 non-marquee games",
      },
    ]);

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.label, "Marquee over rate");
  });

  it("rejects stale marquee findings at promotion time", () => {
    assert.equal(
      isPromotableFinding({
        id: "epl-marquee-efficiency",
        category: "marquee-efficiency",
        headline: "Example",
        summary: "Example",
        stats: [
          {
            label: "Marquee over rate",
            value: "75.0%",
            detail: "8 marquee games",
          },
          {
            label: "Baseline over rate",
            value: "0.0%",
            detail: "0 non-marquee games",
          },
        ],
        sampleNote: "Sample: 8 games",
        links: [],
        score: 1,
        sampleGames: 8,
      }),
      false,
    );
  });
});
