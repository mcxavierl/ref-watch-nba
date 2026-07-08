/**
 * Deterministic NL → StatsQuery parser for tests and offline fallback.
 * Production path uses the LLM tool-calling agent in agent.ts.
 */

import {
  defaultStatsQuery,
  normalizeStatsQuery,
  type StatsQuery,
  type StatsQueryLocation,
} from "@/lib/stats-query/schema";
import { DEFAULT_SINCE_SEASON, NBA_TEN_SEASONS } from "@/lib/league-seasons";

const SEASON_RE = /\b(20\d{2})-(\d{2})\b/g;

function extractSeasons(text: string): string[] {
  const seasons: string[] = [];
  for (const match of text.matchAll(SEASON_RE)) {
    seasons.push(`${match[1]}-${match[2]}`);
  }
  return [...new Set(seasons)];
}

function extractRefName(text: string): string | null {
  const patterns = [
    /\b(?:ref(?:eree)?|official)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\b/,
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\s+(?:has reffed|reffed|refs|officiated)\b/i,
    /\bhow (?:has|does) ([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\b/i,
    /\b([A-Z][a-z]+)\b(?=\s+(?:home|away)\s+games)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }

  const lastFirst = text.match(
    /\b([A-Z]\.?\s+[A-Z][a-z]+|[A-Z][a-z]+\s+[A-Z][a-z]+)\b/,
  );
  if (lastFirst && !/thunder|okc|nba/i.test(lastFirst[1])) {
    return lastFirst[1].trim();
  }

  const bare = text.trim();
  if (/^[A-Za-z]+$/.test(bare) && bare.length >= 4) {
    return bare;
  }

  return null;
}

function extractLocation(text: string): StatsQueryLocation {
  const lower = text.toLowerCase();
  if (/\bhome\b/.test(lower) && !/\baway\b/.test(lower)) return "home";
  if (/\baway\b/.test(lower) && !/\bhome\b/.test(lower)) return "away";
  if (/\bat home\b/.test(lower)) return "home";
  if (/\bon the road\b/.test(lower)) return "away";
  return "any";
}

function extractOpponent(text: string): string | null {
  const vs = text.match(/\bvs\.?\s+([A-Za-z0-9 .]+?)(?:\s+since|\s+in|\s+when|\?|$)/i);
  if (vs?.[1]) return vs[1].trim();
  const against = text.match(/\bagainst (?:the )?([A-Za-z0-9 .]+?)(?:\s+since|\s+in|\?|$)/i);
  if (against?.[1]) return against[1].trim();
  return null;
}

function extractContext(text: string): StatsQuery["context"] {
  const lower = text.toLowerCase();
  if (/back[- ]?to[- ]?back|b2b|second night/.test(lower)) return "back_to_back";
  if (/rest advantage|more rest|well rested/.test(lower)) return "rest_advantage";
  return null;
}

function extractOpponentTier(text: string): StatsQuery["opponent_tier"] {
  const lower = text.toLowerCase();
  if (/top[- ]?10|elite opponents|best teams/.test(lower)) return "top10";
  if (/bottom[- ]?10|worst teams|weak opponents/.test(lower)) return "bottom10";
  if (/mid(dle)? (tier|pack|teams)|middle third/.test(lower)) return "mid";
  return null;
}

function extractSinceYear(text: string): string | null {
  const since = text.match(/\bsince\s+(20\d{2})\b/i);
  if (!since) return null;
  const y = Number.parseInt(since[1], 10);
  const end = String((y + 1) % 100).padStart(2, "0");
  return `${y}-${end}`;
}

export function parseNlToStatsQuery(text: string): StatsQuery {
  const base = defaultStatsQuery();
  const lower = text.toLowerCase();

  const team =
    /\bthunder\b|\bokc\b|\boklahoma\b/i.test(text) ? "OKC" : base.team;

  const seasons = extractSeasons(text);
  const sinceSeason = extractSinceYear(text);
  let season: StatsQuery["season"] = null;
  if (seasons.length === 1) season = seasons[0];
  else if (seasons.length > 1) season = seasons;
  else if (sinceSeason) season = sinceSeason;

  if (/since 2021|last five seasons|past five seasons|5-year|five seasons/.test(lower)) {
    season = NBA_TEN_SEASONS.slice(-5);
  }
  if (/last ten seasons|past ten seasons|10-year|ten seasons|since 2016/.test(lower)) {
    season = [...NBA_TEN_SEASONS];
  }

  return normalizeStatsQuery({
    ref: extractRefName(text),
    team,
    opponent: extractOpponent(text),
    location: extractLocation(text),
    season,
    date_range: null,
    context: extractContext(text),
    opponent_tier: extractOpponentTier(text),
  });
}
