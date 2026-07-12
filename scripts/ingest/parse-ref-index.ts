import * as cheerio from "cheerio";
import { normalizeRefName } from "../../src/lib/bbr-ref-team-records";

export interface BbrRefIndexEntry {
  name: string;
  number: number;
  slug: string;
}

/** Known 2025-26 NBA referee jersey numbers (supplements BBR index which lacks numbers). */
export const NBA_REF_NUMBERS: Record<string, number> = {
  "Ray Acosta": 54,
  "Brandon Adair": 67,
  "Brent Barnaky": 36,
  "Dannica Baroody": 89,
  "Curtis Blair": 74,
  "Tony Brothers": 25,
  "Nick Buchert": 3,
  "John Butler": 30,
  "James Capers": 19,
  "Derrick Collins": 11,
  "John Conley": 56,
  "Sean Corbin": 33,
  "Kevin Cutler": 34,
  "Mousa Dagher": 28,
  "Eric Dalen": 37,
  "Marc Davis": 8,
  "JB DeRosa": 14,
  "Mitchell Ervin": 27,
  "Che Flores": 91,
  "Tyler Ford": 39,
  "Brian Forte": 45,
  "Scott Foster": 48,
  "Pat Fraher": 26,
  "Jacyn Goble": 68,
  "John Goble": 10,
  "Jason Goldenberg": 35,
  "Nate Green": 41,
  "David Guthrie": 16,
  "Robert Hussey": 85,
  "Intae Hwang": 73,
  "Simone Jelks": 81,
  "Matt Kallio": 53,
  "Bill Kennedy": 55,
  "Courtney Kirkland": 61,
  "Marat Kogut": 32,
  "Karl Lane": 77,
  "Mark Lindsay": 29,
  "Tre Maddox": 23,
  "Ed Malloy": 7,
  "Biniam Maru": 94,
  "Suyash Mehta": 82,
  "Jamahl Mosley": 97,
  "Andy Nagy": 83,
  "Brandon Schwab": 86,
  "J.T. Orr": 72,
  "Gediminas Petraitis": 78,
  "Phenizee Ransom": 70,
  "Jenna Reneau": 93,
  "Kevin Scott": 24,
  "Danielle Scott": 87,
  "Ben Taylor": 46,
  "Dedric Taylor": 21,
  "Josh Tiven": 58,
  "Tom Washington": 49,
  "Zach Zarba": 15,
  "Rodney Mott": 71,
};

export function parseBbrRefIndex(html: string): BbrRefIndexEntry[] {
  const $ = cheerio.load(html);
  const refs: BbrRefIndexEntry[] = [];
  const seen = new Set<string>();

  $('tr th[data-stat="referee"], tr td[data-stat="referee"]').each(
    (_, cell) => {
      const row = $(cell).closest("tr");
      const nameCell = row.find('[data-stat="referee"]');
      const name =
        nameCell.find("a").text().trim() || nameCell.text().trim();
      if (!name || name === "Referee") return;

      const norm = normalizeRefName(name);
      if (seen.has(norm)) return;
      seen.add(norm);

      const href = nameCell.find("a").attr("href") ?? "";
      const slug = href.split("/").filter(Boolean).pop() ?? norm;
      const number = NBA_REF_NUMBERS[name] ?? 0;

      refs.push({ name, number, slug });
    },
  );

  return refs;
}

export function buildRefIndexMap(
  entries: BbrRefIndexEntry[],
): Map<string, BbrRefIndexEntry> {
  const map = new Map<string, BbrRefIndexEntry>();
  for (const entry of entries) {
    map.set(normalizeRefName(entry.name), entry);
  }
  return map;
}

export function mergeOfficialIntoIndex(
  index: Map<string, BbrRefIndexEntry>,
  name: string,
  number: number,
): void {
  const norm = normalizeRefName(name);
  const existing = index.get(norm);
  if (existing) {
    if (number > 0) existing.number = number;
    return;
  }
  index.set(norm, {
    name,
    number,
    slug: norm,
  });
}

export function parseBbrBoxScoreOfficials(html: string): string[] {
  const $ = cheerio.load(html);
  const officials: string[] = [];

  const linked = $("strong")
    .filter((_, el) => /^Officials?:?$/i.test($(el).text().trim()))
    .first()
    .parent()
    .find("a[href*='/referees/']");
  if (linked.length > 0) {
    linked.each((_, el) => {
      const name = $(el).text().trim();
      if (name) officials.push(name);
    });
    if (officials.length > 0) return officials;
  }

  const scorebox = $(".scorebox_meta, #content .scorebox");
  const text = scorebox.text();
  const match = text.match(/Officials?:\s*([^\n]+)/i);
  if (match?.[1]) {
    for (const name of match[1].split(",")) {
      const trimmed = name.trim();
      if (trimmed) officials.push(trimmed);
    }
  }

  return officials;
}
