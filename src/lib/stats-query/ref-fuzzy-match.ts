import { normalizeRefName } from "@/lib/bbr-ref-team-records";
import { getRefStats } from "@/lib/data";
import type { RefProfile } from "@/lib/types";

export interface RefMatchResult {
  ref: RefProfile;
  score: number;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function tokenizeRefQuery(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/\b(jr|sr|iii|ii)\b\.?/g, "")
    .split(/[\s,.-]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function matchScore(query: string, ref: RefProfile): number {
  const qNorm = normalizeRefName(query);
  const nameNorm = normalizeRefName(ref.name);
  if (!qNorm) return 0;

  if (qNorm === nameNorm) return 1;
  if (nameNorm.includes(qNorm) || qNorm.includes(nameNorm)) return 0.92;

  const tokens = tokenizeRefQuery(query);
  const last = ref.name.split(" ").pop()?.toLowerCase() ?? "";
  const first = ref.name.split(" ")[0]?.toLowerCase() ?? "";

  if (tokens.length === 1) {
    if (tokens[0] === last) return 0.88;
    if (tokens[0] === first) return 0.55;
    if (last.startsWith(tokens[0]) || tokens[0].startsWith(last)) return 0.8;
  }

  if (tokens.length >= 2) {
    const qFirst = tokens[0];
    const qLast = tokens[tokens.length - 1];
    if (
      (qFirst[0] === first[0] || qFirst === first) &&
      (qLast === last || last.startsWith(qLast))
    ) {
      return 0.9;
    }
  }

  const dist = levenshtein(qNorm, nameNorm);
  const maxLen = Math.max(qNorm.length, nameNorm.length);
  if (maxLen === 0) return 0;
  const similarity = 1 - dist / maxLen;
  return similarity >= 0.72 ? similarity * 0.85 : 0;
}

export function fuzzyMatchRef(
  input: string,
  refs = getRefStats().refs,
  minScore = 0.72,
): RefMatchResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let best: RefMatchResult | null = null;
  for (const ref of refs) {
    const score = matchScore(trimmed, ref);
    if (score < minScore) continue;
    if (!best || score > best.score) {
      best = { ref, score };
    }
  }
  return best;
}

export function listCanonicalRefNames(): string[] {
  return getRefStats().refs.map((r) => r.name);
}
