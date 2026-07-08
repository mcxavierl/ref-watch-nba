export interface EplTeam {
  abbr: string;
  name: string;
  city: string;
}

/** 2024-25 Premier League clubs. */
export const EPL_TEAMS: EplTeam[] = [
  { abbr: "ARS", name: "Arsenal", city: "Arsenal" },
  { abbr: "AVL", name: "Aston Villa", city: "Aston Villa" },
  { abbr: "BOU", name: "Bournemouth", city: "Bournemouth" },
  { abbr: "BRE", name: "Brentford", city: "Brentford" },
  { abbr: "BHA", name: "Brighton", city: "Brighton" },
  { abbr: "CHE", name: "Chelsea", city: "Chelsea" },
  { abbr: "CRY", name: "Crystal Palace", city: "Crystal Palace" },
  { abbr: "EVE", name: "Everton", city: "Everton" },
  { abbr: "FUL", name: "Fulham", city: "Fulham" },
  { abbr: "IPS", name: "Ipswich Town", city: "Ipswich" },
  { abbr: "LEI", name: "Leicester City", city: "Leicester" },
  { abbr: "LIV", name: "Liverpool", city: "Liverpool" },
  { abbr: "MCI", name: "Manchester City", city: "Man City" },
  { abbr: "MUN", name: "Manchester United", city: "Man Utd" },
  { abbr: "NEW", name: "Newcastle United", city: "Newcastle" },
  { abbr: "NFO", name: "Nottingham Forest", city: "Nott'm Forest" },
  { abbr: "SOU", name: "Southampton", city: "Southampton" },
  { abbr: "TOT", name: "Tottenham Hotspur", city: "Spurs" },
  { abbr: "WHU", name: "West Ham United", city: "West Ham" },
  { abbr: "WOL", name: "Wolverhampton Wanderers", city: "Wolves" },
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

export function teamLogoUrl(_abbr: string): string {
  return "";
}

export function matchTeamString(team: string): EplTeam | undefined {
  const n = team.trim().toLowerCase();
  if (!n) return undefined;
  const direct = teamByAbbr.get(n.toUpperCase());
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
