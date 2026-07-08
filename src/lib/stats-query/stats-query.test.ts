import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatStatsAnswer,
  refuseWithoutToolMessage,
  runStatsQueryAgent,
  type LlmClient,
} from "@/lib/stats-query/agent";
import { parseNlToStatsQuery } from "@/lib/stats-query/nl-parse";
import { fuzzyMatchRef } from "@/lib/stats-query/ref-fuzzy-match";
import { query_stats } from "@/lib/stats-query/query-stats";
import {
  INSUFFICIENT_SAMPLE_THRESHOLD,
  MIN_REF_SAMPLE,
  sampleFlagForN,
  validateStatsQuery,
} from "@/lib/stats-query/schema";
import { wilsonScoreInterval } from "@/lib/stats-query/wilson-ci";

describe("ref fuzzy match", () => {
  it("resolves Tony Brothers variants", () => {
    for (const q of ["Tony Brothers", "brothers", "T. Brothers", "tony brothers"]) {
      const m = fuzzyMatchRef(q);
      assert.ok(m, `expected match for ${q}`);
      assert.equal(m!.ref.name, "Tony Brothers");
    }
  });
});

describe("NL → StatsQuery parsing", () => {
  const cases: Array<{ prompt: string; check: (q: ReturnType<typeof parseNlToStatsQuery>) => void }> = [
    {
      prompt: "How do the Thunder do when Tony Brothers refs them at home since 2021?",
      check: (q) => {
        assert.match(q.ref ?? "", /Tony|Brothers/i);
        assert.equal(q.team, "OKC");
        assert.equal(q.location, "home");
        assert.ok(Array.isArray(q.season) && q.season.length >= 4);
      },
    },
    {
      prompt: "OKC record with brothers away games",
      check: (q) => {
        assert.ok(q.ref);
        assert.equal(q.location, "away");
      },
    },
    {
      prompt: "Thunder vs Lakers when Scott Foster officiates",
      check: (q) => {
        assert.match(q.ref ?? "", /Foster/i);
        assert.equal(q.opponent, "Lakers");
      },
    },
    {
      prompt: "Thunder home games in 2023-24",
      check: (q) => {
        assert.equal(q.season, "2023-24");
        assert.equal(q.location, "home");
      },
    },
    {
      prompt: "How has OKC done on back to backs since 2022?",
      check: (q) => {
        assert.equal(q.context, "back_to_back");
        assert.equal(q.team, "OKC");
      },
    },
    {
      prompt: "Thunder with rest advantage against top 10 opponents",
      check: (q) => {
        assert.equal(q.context, "rest_advantage");
        assert.equal(q.opponent_tier, "top10");
      },
    },
    {
      prompt: "What is the Thunder win rate at home?",
      check: (q) => {
        assert.equal(q.location, "home");
        assert.equal(q.ref, null);
      },
    },
    {
      prompt: "Brothers",
      check: (q) => {
        assert.ok(q.ref);
      },
    },
    {
      prompt: "Thunder away games vs bottom 10 teams 2024-25",
      check: (q) => {
        assert.equal(q.location, "away");
        assert.equal(q.opponent_tier, "bottom10");
        assert.equal(q.season, "2024-25");
      },
    },
    {
      prompt: "When T. Brothers refs Thunder home games how many wins?",
      check: (q) => {
        assert.ok(q.ref);
        assert.equal(q.location, "home");
        assert.equal(q.team, "OKC");
      },
    },
  ];

  for (const { prompt, check } of cases) {
    it(`parses: ${prompt.slice(0, 50)}…`, () => {
      check(parseNlToStatsQuery(prompt));
    });
  }
});

describe("query_stats output shape", () => {
  it("returns required fields for Tony Brothers Thunder home", () => {
    const result = query_stats({
      ref: "Tony Brothers",
      team: "OKC",
      location: "home",
      season: ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"],
    });

    assert.equal(typeof result.wins, "number");
    assert.equal(typeof result.losses, "number");
    assert.equal(result.n, result.wins + result.losses);
    assert.ok(result.win_pct >= 0 && result.win_pct <= 1);
    assert.ok(result.wilson_ci_low >= 0 && result.wilson_ci_high <= 1);
    assert.ok(
      ["sufficient", "small", "insufficient"].includes(result.sample_flag),
    );
    assert.equal(result.resolved.ref_name, "Tony Brothers");
    assert.equal(result.resolved.team, "OKC");
  });

  it("flags insufficient samples below threshold", () => {
    assert.equal(sampleFlagForN(INSUFFICIENT_SAMPLE_THRESHOLD - 1), "insufficient");
    assert.equal(sampleFlagForN(INSUFFICIENT_SAMPLE_THRESHOLD), "small");
    assert.equal(sampleFlagForN(MIN_REF_SAMPLE), "sufficient");
  });

  it("wilson interval widens on small n", () => {
    const small = wilsonScoreInterval(2, 6);
    const large = wilsonScoreInterval(20, 60);
    assert.ok(small.high - small.low > large.high - large.low);
  });
});

describe("agent tool enforcement", () => {
  it("refuses stat answers when LLM skips tool call", async () => {
    const noToolLlm: LlmClient = {
      async complete() {
        return {
          content: "Thunder are 50-30 with Tony Brothers.",
          tool_calls: [],
        };
      },
    };

    const result = await runStatsQueryAgent(
      "What is the Thunder record with Tony Brothers?",
      noToolLlm,
    );

    assert.equal(result.refused_without_tool, true);
    assert.equal(result.answer, refuseWithoutToolMessage());
    assert.equal(result.tool_result, null);
  });

  it("includes n and CI when sample is small", async () => {
    const toolLlm: LlmClient = {
      async complete() {
        return {
          content: null,
          tool_calls: [
            {
              name: "query_stats",
              arguments: JSON.stringify({
                ref: "Tony Brothers",
                team: "OKC",
                opponent: null,
                location: "home",
                season: ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"],
                date_range: null,
                context: null,
                opponent_tier: null,
              }),
            },
          ],
        };
      },
    };

    const result = await runStatsQueryAgent(
      "Tony Brothers Thunder home record",
      toolLlm,
    );

    assert.ok(result.tool_result);
    assert.match(result.answer, /n=\d+/);
    assert.match(result.answer, /95% CI/);
    if (result.tool_result!.sample_flag === "insufficient") {
      assert.match(result.answer, /too small to draw a conclusion/i);
    }
  });

  it("formatStatsAnswer never invents numbers beyond tool result", () => {
    const result = query_stats({
      ref: "Tony Brothers",
      team: "OKC",
      location: "home",
      season: ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"],
    });
    const text = formatStatsAnswer(
      {
        ref: "Tony Brothers",
        team: "OKC",
        opponent: null,
        location: "home",
        season: ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"],
        date_range: null,
        context: null,
        opponent_tier: null,
      },
      result,
    );
    assert.match(text, new RegExp(`${result.wins}-${result.losses}`));
    assert.match(text, new RegExp(`n=${result.n}`));
  });
});

describe("schema validation", () => {
  it("rejects invalid season labels", () => {
    const errors = validateStatsQuery({
      ref: null,
      team: "OKC",
      opponent: null,
      location: "any",
      season: "2023",
      date_range: null,
      context: null,
      opponent_tier: null,
    });
    assert.ok(errors.length > 0);
  });
});
