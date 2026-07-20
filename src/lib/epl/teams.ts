export interface EplTeam {
  abbr: string;
  name: string;
  city: string;
  espnId: number;
}

/** 2024-25 Premier League clubs. espnId maps to ESPN CDN logos. */
export const EPL_TEAMS: EplTeam[] = [
  { abbr: "ARS", name: "Arsenal", city: "Arsenal", espnId: 359 },
  { abbr: "AVL", name: "Aston Villa", city: "Aston Villa", espnId: 362 },
  { abbr: "BOU", name: "Bournemouth", city: "Bournemouth", espnId: 349 },
  { abbr: "BRE", name: "Brentford", city: "Brentford", espnId: 337 },
  { abbr: "BHA", name: "Brighton", city: "Brighton", espnId: 331 },
  { abbr: "CHE", name: "Chelsea", city: "Chelsea", espnId: 363 },
  { abbr: "COV", name: "Coventry City", city: "Coventry", espnId: 388 },
  { abbr: "CRY", name: "Crystal Palace", city: "Crystal Palace", espnId: 384 },
  { abbr: "EVE", name: "Everton", city: "Everton", espnId: 368 },
  { abbr: "FUL", name: "Fulham", city: "Fulham", espnId: 370 },
  { abbr: "IPS", name: "Ipswich Town", city: "Ipswich", espnId: 373 },
  { abbr: "LEI", name: "Leicester City", city: "Leicester", espnId: 375 },
  { abbr: "LIV", name: "Liverpool", city: "Liverpool", espnId: 364 },
  { abbr: "MCI", name: "Manchester City", city: "Man City", espnId: 382 },
  { abbr: "MUN", name: "Manchester United", city: "Man Utd", espnId: 360 },
  { abbr: "NEW", name: "Newcastle United", city: "Newcastle", espnId: 361 },
  { abbr: "NFO", name: "Nottingham Forest", city: "Nott'm Forest", espnId: 393 },
  { abbr: "SOU", name: "Southampton", city: "Southampton", espnId: 376 },
  { abbr: "TOT", name: "Tottenham Hotspur", city: "Spurs", espnId: 367 },
  { abbr: "WHU", name: "West Ham United", city: "West Ham", espnId: 371 },
  { abbr: "WOL", name: "Wolverhampton Wanderers", city: "Wolves", espnId: 380 },
];

export const EPL_TEAM_ABBRS = EPL_TEAMS.map((t) => t.abbr);

const teamByAbbr = new Map(EPL_TEAMS.map((t) => [t.abbr, t]));

export function getTeam(abbr: string): EplTeam | undefined {
  return teamByAbbr.get(abbr.toUpperCase());
}

export function getTeamOrThrow(abbr: string): EplTeam {
  const t = getTeam(abbr);
  if (!t) throw new Error(`Unknown team: ${abbr}`);
  return t;
}

export function teamFullName(team: EplTeam): string {
  return team.name;
}

export function teamWithArticle(team: EplTeam): string {
  return `the ${team.name}`;
}

export function teamLogoUrl(abbr: string): string {
  const team = getTeam(abbr);
  if (!team) return "";
  return `https://a.espncdn.com/i/teamlogos/soccer/500/${team.espnId}.png`;
}

export function matchTeamString(team: string): EplTeam | undefined {
  const n = team.trim().toLowerCase();
  if (!n) return undefined;
  const aliases: Record<string, string> = { man: "MUN", mnc: "MCI" };
  const alias = aliases[n];
  const direct = teamByAbbr.get((alias ?? n).toUpperCase());
  if (direct) return direct;
  for (const t of EPL_TEAMS) {
    const full = teamFullName(t).toLowerCase();
    if (
      n === full ||
      n.includes(t.name.toLowerCase()) ||
      n.includes(t.city.toLowerCase())
    ) {
      return t;
    }
  }
  return undefined;
}

export function detectTeamsInGame(awayTeam: string, homeTeam: string): EplTeam[] {
  const out: EplTeam[] = [];
  for (const raw of [awayTeam, homeTeam]) {
    const m = matchTeamString(raw);
    if (m && !out.some((t) => t.abbr === m.abbr)) out.push(m);
  }
  return out;
}
