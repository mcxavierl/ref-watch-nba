import * as cheerio from "cheerio";
import { normalizeRefName } from "../../src/lib/bbr-ref-team-records";

export interface BbrRefIndexEntry {
  name: string;
  number: number;
  slug: string;
}

export function parseBbrRefIndex(html: string): BbrRefIndexEntry[] {
  const $ = cheerio.load(html);
  const refs: BbrRefIndexEntry[] = [];

  $("#refs tbody tr, table#refs tbody tr").each((_, tr) => {
    const row = $(tr);
    const nameCell = row.find('[data-stat="referee"]');
    const name =
      nameCell.find("a").text().trim() || nameCell.text().trim();
    if (!name) return;

    const numText = row.find('[data-stat="number"]').text().trim();
    const number = Number.parseInt(numText, 10);
    if (!Number.isFinite(number)) return;

    const href = nameCell.find("a").attr("href") ?? "";
    const slug = href.split("/").filter(Boolean).pop() ?? normalizeRefName(name);

    refs.push({ name, number, slug });
  });

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

export function parseBbrBoxScoreOfficials(html: string): string[] {
  const $ = cheerio.load(html);
  const officials: string[] = [];

  $("#content .section_content, .scorebox_meta").each((_, el) => {
    const text = $(el).text();
    const match = text.match(/Officials?:\s*([^\n]+)/i);
    if (match?.[1]) {
      for (const name of match[1].split(",")) {
        const trimmed = name.trim();
        if (trimmed) officials.push(trimmed);
      }
    }
  });

  if (officials.length === 0) {
    $("div").each((_, el) => {
      const t = $(el).text();
      if (/Officials?:/i.test(t)) {
        const m = t.match(/Officials?:\s*([^\n]+)/i);
        if (m?.[1]) {
          for (const name of m[1].split(",")) {
            const trimmed = name.trim();
            if (trimmed) officials.push(trimmed);
          }
        }
      }
    });
  }

  return officials;
}
