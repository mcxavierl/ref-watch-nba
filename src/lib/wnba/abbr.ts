/** Map ESPN / assignment abbreviations to canonical WNBA team keys. */
const ESPN_TO_CANONICAL: Record<string, string> = {
  WSH: "WAS",
  NY: "NYL",
  LV: "LVA",
  LA: "LAS",
  PHX: "PHO",
  GS: "GSV",
};

const CANONICAL_TO_ESPN_LOGO: Record<string, string> = {
  WAS: "wsh",
  NYL: "ny",
  LVA: "lv",
  LAS: "la",
  PHO: "phx",
  GSV: "gs",
};

export function normalizeWnbaAbbr(abbr: string): string {
  const key = abbr.toUpperCase();
  return ESPN_TO_CANONICAL[key] ?? key;
}

export function wnbaLogoAbbr(abbr: string): string {
  const canonical = normalizeWnbaAbbr(abbr);
  return CANONICAL_TO_ESPN_LOGO[canonical] ?? canonical.toLowerCase();
}

export function wnbaAbbrAliases(abbr: string): string[] {
  const canonical = normalizeWnbaAbbr(abbr);
  const aliases = new Set<string>([canonical]);
  for (const [espn, canon] of Object.entries(ESPN_TO_CANONICAL)) {
    if (canon === canonical) aliases.add(espn);
  }
  return [...aliases];
}
