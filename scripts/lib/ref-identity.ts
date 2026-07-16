/**
 * Shared referee identity resolution.
 *
 * Officials appear across data sources under different jersey numbers and
 * different spellings of the same name. Keying stats on `name + number`
 * (see `refSlug`) therefore splits one person into several profiles — the
 * reason a single referee could land in both a "top" and "bottom" list.
 *
 * `canonicalRefKey` produces a stable, number-independent identity by:
 *   1. lowercasing and stripping punctuation,
 *   2. collapsing runs of single-letter tokens so initials match regardless
 *      of punctuation ("J.B. DeRosa" → "jb derosa" === "JB DeRosa"),
 *   3. remapping known same-person aliases via `REF_NAME_ALIASES`.
 *
 * Aliases are an explicit, curated list on purpose: automatic name matching
 * would wrongly merge genuinely distinct officials who share an initial and
 * surname (e.g. NFL's Jerry Bergman and Jeff Bergman).
 */

/** A curated same-person mapping. `variants` collapse into `canonical`. */
export interface RefAlias {
  /** Proper display name used for the merged profile. */
  canonical: string;
  /** Alternate spellings seen in source data (any capitalization/punctuation). */
  variants: string[];
}

/**
 * Verified same-person name variants. Only add an entry when the data shows
 * the same official (shared jersey number, complementary date ranges, or a
 * single unambiguous full-name match for an abbreviated form).
 */
/**
 * Audit log (2026-07-15, Priority #5):
 * - NFL: Pete/Peter Morelli, Ron/Ronald Torbert (#62), Gerry/Gerald Austin merged.
 * - NOT merged (distinct officials): Jerry Bergman vs Jeff Bergman; Joe vs Justin Larrew.
 * - EPL: one-game abbreviated fragments (A Moss, S Scott, K Kavanagh, O Oliver) left unmerged.
 */
export const REF_NAME_ALIASES: RefAlias[] = [
  // NBA — first-name / spelling differences between NBA Stats and BBR feeds.
  { canonical: "Jacyn Goble", variants: ["John Goble"] },
  // NBA — married-name change; BBR uses the hyphenated form, logs the short one.
  { canonical: "Lauren Holtkamp", variants: ["Lauren Holtkamp-Sterling"] },
  // NFL — nickname / formal-name splits in ESPN historical feeds (complementary seasons).
  { canonical: "Peter Morelli", variants: ["Pete Morelli"] },
  { canonical: "Ronald Torbert", variants: ["Ron Torbert"] },
  { canonical: "Gerald Austin", variants: ["Gerry Austin"] },
  // EPL — ESPN emits abbreviated "I. Surname" forms alongside full names.
  { canonical: "Anthony Taylor", variants: ["A Taylor"] },
  { canonical: "Craig Pawson", variants: ["C Pawson"] },
  { canonical: "Andre Marriner", variants: ["A Marriner"] },
  { canonical: "Mike Dean", variants: ["M Dean"] },
  { canonical: "Jonathan Moss", variants: ["J Moss"] },
  { canonical: "Martin Atkinson", variants: ["M Atkinson"] },
  { canonical: "Robert Madley", variants: ["R Madley"] },
  { canonical: "Kevin Friend", variants: ["K Friend"] },
  { canonical: "Lee Mason", variants: ["L Mason"] },
  { canonical: "Graham Scott", variants: ["G Scott"] },
  { canonical: "Neil Swarbrick", variants: ["N Swarbrick"] },
  { canonical: "Mark Clattenburg", variants: ["M Clattenburg"] },
  { canonical: "Roger East", variants: ["R East"] },
  { canonical: "Michael Jones", variants: ["Mike Jones"] },
];

/** Lowercase, strip punctuation, and collapse initial runs (no alias step). */
function baseKey(name: string): string {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const out: string[] = [];
  let initials = "";
  for (const token of tokens) {
    if (token.length === 1) {
      initials += token;
    } else {
      if (initials) {
        out.push(initials);
        initials = "";
      }
      out.push(token);
    }
  }
  if (initials) out.push(initials);
  return out.join(" ");
}

/** baseKey(variant) → baseKey(canonical) for every alias entry. */
const ALIAS_KEY_REMAP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const alias of REF_NAME_ALIASES) {
    const canonicalKey = baseKey(alias.canonical);
    for (const variant of alias.variants) {
      map.set(baseKey(variant), canonicalKey);
    }
  }
  return map;
})();

/** canonical key → proper display name, for alias groups. */
const ALIAS_DISPLAY: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const alias of REF_NAME_ALIASES) {
    map.set(baseKey(alias.canonical), alias.canonical);
  }
  return map;
})();

/** Number- and spelling-independent identity key for a referee. */
export function canonicalRefKey(name: string): string {
  const key = baseKey(name);
  return ALIAS_KEY_REMAP.get(key) ?? key;
}

/**
 * Resolve a name to its curated canonical spelling when it belongs to an alias
 * group; otherwise return the name unchanged. Useful for matching across feeds
 * (e.g. Basketball-Reference) that use a different spelling than the roster.
 */
export function resolveCanonicalName(name: string): string {
  return ALIAS_DISPLAY.get(canonicalRefKey(name)) ?? name;
}

/**
 * Preferred display name for a canonical key. Alias groups use their curated
 * proper name; everything else falls back to the observed name provided.
 */
export function displayNameForKey(canonicalKey: string, fallbackName: string): string {
  return ALIAS_DISPLAY.get(canonicalKey) ?? fallbackName;
}

const SLUG_LIKE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;

function titleCaseWords(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Recover a proper display name when profile.name was incorrectly stored as a slug
 * (e.g. "mike-jones-0" instead of "Michael Jones").
 */
export function repairRefDisplayName(name: string, slug: string): string {
  if (name !== slug && !SLUG_LIKE_NAME.test(name)) {
    return resolveCanonicalName(name);
  }

  const base = slug.replace(/-\d+$/, "").replace(/-/g, " ");
  const titled = titleCaseWords(base);
  return displayNameForKey(canonicalRefKey(titled), titled);
}

/** One jersey-number/name variant seen for a canonical referee identity. */
export interface RefVariant {
  name: string;
  number: number;
  games: number;
  lastDate: string;
}

/**
 * Pick the display identity for a merged referee: the variant worked the most
 * games under, breaking ties toward the most recent game.
 */
export function chooseRefIdentity<T extends { games: number; lastDate: string }>(
  variants: Iterable<T>,
): T {
  return [...variants].sort(
    (a, b) => b.games - a.games || b.lastDate.localeCompare(a.lastDate),
  )[0];
}

/** Detect First Last ↔ Last First ghosts among numbered vs number-0 refs. */
export function findReverseNameGhosts(
  refs: { name: string; number: number; games: number; slug: string }[],
): {
  ghostSlug: string;
  ghostName: string;
  canonSlug: string;
  canonName: string;
}[] {
  const numbered = refs.filter((r) => r.number > 0);
  const ghosts: {
    ghostSlug: string;
    ghostName: string;
    canonSlug: string;
    canonName: string;
  }[] = [];

  for (const ghost of refs.filter((r) => r.number === 0 && r.games > 0)) {
    const parts = baseKey(ghost.name).split(/\s+/).filter(Boolean);
    if (parts.length !== 2) continue;
    const flipped = `${parts[1]} ${parts[0]}`;
    const canon = numbered.find((r) => baseKey(r.name) === flipped);
    if (canon) {
      ghosts.push({
        ghostSlug: ghost.slug,
        ghostName: ghost.name,
        canonSlug: canon.slug,
        canonName: canon.name,
      });
    }
  }
  return ghosts;
}
