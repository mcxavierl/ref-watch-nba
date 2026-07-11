/**
 * Known ESPN / feed name mistakes → canonical roster name.
 * Prefer roster reverse-name matching; keep explicit aliases for stubborn cases.
 */
export function normalizeOfficialNameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

export const NFL_OFFICIAL_NAME_ALIASES: Record<string, string> = {
  "clark land": "Land Clark",
};

/** If "Last First" is a known roster "First Last", return the roster form. */
export function canonicalizeOfficialName(
  rawName: string,
  roster: Map<string, number>,
): { name: string; number: number } {
  const alias = NFL_OFFICIAL_NAME_ALIASES[normalizeOfficialNameKey(rawName)];
  const name = alias ?? rawName.trim();
  const key = normalizeOfficialNameKey(name);

  const direct = roster.get(key);
  if (direct !== undefined) {
    for (const [rosterKey, num] of roster) {
      if (rosterKey === key) {
        return { name: titleCaseFromKey(rosterKey, name), number: num };
      }
    }
    return { name, number: direct };
  }

  const parts = key.split(/\s+/).filter(Boolean);
  if (parts.length === 2) {
    const flipped = `${parts[1]} ${parts[0]}`;
    const flippedNum = roster.get(flipped);
    if (flippedNum !== undefined) {
      return {
        name: titleCaseFromKey(flipped, `${parts[1]} ${parts[0]}`),
        number: flippedNum,
      };
    }
  }

  if (parts.length >= 2) {
    const last = parts[parts.length - 1]!;
    const matches: { key: string; num: number }[] = [];
    for (const [k, num] of roster) {
      if (k.split(/\s+/).pop() === last) matches.push({ key: k, num });
    }
    if (matches.length === 1) {
      return {
        name: titleCaseFromKey(matches[0]!.key, name),
        number: matches[0]!.num,
      };
    }
  }

  return { name, number: 0 };
}

function titleCaseFromKey(key: string, fallback: string): string {
  if (!key) return fallback;
  return key
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Detect First Last ↔ Last First ghosts among numbered vs number-0 refs. */
export { findReverseNameGhosts } from "../../lib/ref-identity";
