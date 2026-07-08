import {
  STATS_QUERY_JSON_SCHEMA,
  type StatsQuery,
  type StatsQueryResult,
} from "@/lib/stats-query/schema";
import { query_stats } from "@/lib/stats-query/query-stats";
import { formatWilsonPct } from "@/lib/stats-query/wilson-ci";
import { appendStatsQueryLog } from "@/lib/stats-query/query-log";
import { getTeam } from "@/lib/teams";

export const STATS_QUERY_AGENT_SYSTEM_PROMPT = `You are a query translator for NBA referee × team win-rate statistics on Ref Watch.

RULES (mandatory):
1. You translate natural-language questions into exactly one call to the \`query_stats\` tool. You never compute or guess statistics yourself.
2. If the user asks for any win-loss record, win rate, sample size, or "how does X do when…" involving refs and teams, you MUST call \`query_stats\` before answering.
3. If you cannot map the question to \`query_stats\`, say you need a clearer ref name, team, or filter — do not invent numbers.
4. After receiving tool output, respond in this exact structure:
   - One sentence with the direct answer including W-L and win %.
   - Parenthetical: (95% CI low-high%, n=N)
   - If sample_flag is "insufficient" (n<10): add "Sample is too small to draw a conclusion." Do not editorialize on direction (no "struggles", "dominates", "trend").
   - If sample_flag is "small": note the limited sample without strong directional language.
5. Default team is OKC (Thunder) when the user mentions Thunder or does not name another team.
6. Fuzzy ref names are resolved server-side; pass the user's ref string as-is in the ref field.

Never answer a statistics question without a tool call. Never cite numbers that did not come from tool output.`;

export const QUERY_STATS_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "query_stats",
    description:
      "Query NBA game logs for team W-L under optional ref, location, opponent, season, date, rest, and opponent-tier filters. Returns wins, losses, n, win_pct, Wilson 95% CI, and sample_flag.",
    parameters: STATS_QUERY_JSON_SCHEMA,
  },
};

export interface LlmToolCall {
  name: string;
  arguments: string;
}

export interface LlmCompletionResult {
  content: string | null;
  tool_calls: LlmToolCall[];
}

export interface LlmClient {
  complete(messages: unknown[], tools: unknown[]): Promise<LlmCompletionResult>;
}

export function formatStatsAnswer(
  query: StatsQuery,
  result: StatsQueryResult,
): string {
  const team = getTeam(result.resolved.team);
  const teamLabel = team ? `${team.city} ${team.name}` : result.resolved.team;
  const refPart = result.resolved.ref_name
    ? `${result.resolved.ref_name} has reffed ${result.n} ${teamLabel}`
    : `${teamLabel} played ${result.n} games`;

  const loc =
    query.location === "home"
      ? " home"
      : query.location === "away"
        ? " away"
        : "";

  const pct = result.n > 0 ? Math.round(result.win_pct * 100) : 0;
  const ci = formatWilsonPct(result.wilson_ci_low, result.wilson_ci_high);

  let sentence = `${refPart}${loc} games in this slice; record is ${result.wins}-${result.losses} (${pct}%, 95% CI ${ci}, n=${result.n}).`;

  if (result.sample_flag === "insufficient") {
    sentence += " Sample is too small to draw a conclusion.";
  } else if (result.sample_flag === "small") {
    sentence += " Sample is limited; treat the direction as exploratory only.";
  }

  return sentence;
}

export function isStatQuestion(text: string): boolean {
  return /\b(record|win[- ]?rate|wins?|loss(es)?|how (?:many|often)|reffed|refs?|officiat|\d+-\d+|percent|%\b)/i.test(
    text,
  );
}

export function refuseWithoutToolMessage(): string {
  return "I need to run query_stats before answering that. Please rephrase with a referee and/or team filter.";
}

export interface AgentRunResult {
  answer: string;
  parsed_query: StatsQuery | null;
  tool_result: StatsQueryResult | null;
  refused_without_tool: boolean;
  raw_tool_calls: LlmToolCall[];
}

export async function runStatsQueryAgent(
  rawNl: string,
  llm: LlmClient,
): Promise<AgentRunResult> {
  const completion = await llm.complete(
    [
      { role: "system", content: STATS_QUERY_AGENT_SYSTEM_PROMPT },
      { role: "user", content: rawNl },
    ],
    [QUERY_STATS_TOOL_DEFINITION],
  );

  const toolCalls = completion.tool_calls.filter((t) => t.name === "query_stats");

  if (toolCalls.length === 0 && isStatQuestion(rawNl)) {
    return {
      answer: refuseWithoutToolMessage(),
      parsed_query: null,
      tool_result: null,
      refused_without_tool: true,
      raw_tool_calls: completion.tool_calls,
    };
  }

  if (toolCalls.length === 0) {
    return {
      answer:
        completion.content?.trim() ||
        "Ask about a referee and team win-loss record (e.g. Tony Brothers Thunder home games since 2021).",
      parsed_query: null,
      tool_result: null,
      refused_without_tool: false,
      raw_tool_calls: [],
    };
  }

  const args = JSON.parse(toolCalls[0].arguments) as Partial<StatsQuery>;
  const result = query_stats(args);

  appendStatsQueryLog({
    raw_nl: rawNl,
    parsed_query: {
      ref: args.ref ?? null,
      team: args.team ?? "OKC",
      opponent: args.opponent ?? null,
      location: args.location ?? "any",
      season: args.season ?? null,
      date_range: args.date_range ?? null,
      context: args.context ?? null,
      opponent_tier: args.opponent_tier ?? null,
    },
    n: result.n,
    sample_flag: result.sample_flag,
  });

  const answer = formatStatsAnswer(
    {
      ref: args.ref ?? null,
      team: args.team ?? "OKC",
      opponent: args.opponent ?? null,
      location: args.location ?? "any",
      season: args.season ?? null,
      date_range: args.date_range ?? null,
      context: args.context ?? null,
      opponent_tier: args.opponent_tier ?? null,
    },
    result,
  );

  return {
    answer,
    parsed_query: args as StatsQuery,
    tool_result: result,
    refused_without_tool: false,
    raw_tool_calls: toolCalls,
  };
}

/** OpenAI-compatible HTTP client (optional; requires OPENAI_API_KEY). */
export function createOpenAiLlmClient(
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL ?? "gpt-4o-mini",
): LlmClient {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  return {
    async complete(messages, tools) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: "auto",
          temperature: 0,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenAI API error ${res.status}: ${body}`);
      }

      const json = (await res.json()) as {
        choices: Array<{
          message: {
            content: string | null;
            tool_calls?: Array<{
              function: { name: string; arguments: string };
            }>;
          };
        }>;
      };

      const message = json.choices[0]?.message;
      return {
        content: message?.content ?? null,
        tool_calls:
          message?.tool_calls?.map((tc) => ({
            name: tc.function.name,
            arguments: tc.function.arguments,
          })) ?? [],
      };
    },
  };
}
