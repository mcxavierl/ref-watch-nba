export interface LaligaTeam {
  abbr: string;
  name: string;
  city: string;
  espnId: number;
}

/** Clubs appearing in La Liga match logs (2016–2026). */
export const LALIGA_TEAMS: LaligaTeam[] = [
  { abbr: "ALA", name: "Alavés", city: "Alavés", espnId: 96 },
  { abbr: "ALM", name: "Almería", city: "Almería", espnId: 6832 },
  { abbr: "ATH", name: "Athletic Club", city: "Athletic", espnId: 93 },
  { abbr: "ATM", name: "Atlético Madrid", city: "Atlético", espnId: 1068 },
  { abbr: "BAR", name: "Barcelona", city: "Barcelona", espnId: 83 },
  { abbr: "BET", name: "Real Betis", city: "Betis", espnId: 244 },
  { abbr: "CAD", name: "Cádiz", city: "Cádiz", espnId: 3842 },
  { abbr: "CEL", name: "Celta Vigo", city: "Celta", espnId: 85 },
  { abbr: "DEP", name: "Deportivo La Coruña", city: "Deportivo", espnId: 90 },
  { abbr: "EIB", name: "Eibar", city: "Eibar", espnId: 3752 },
  { abbr: "ELC", name: "Elche", city: "Elche", espnId: 3751 },
  { abbr: "ESP", name: "Espanyol", city: "Espanyol", espnId: 88 },
  { abbr: "GET", name: "Getafe", city: "Getafe", espnId: 2922 },
  { abbr: "GIR", name: "Girona", city: "Girona", espnId: 9812 },
  { abbr: "GRN", name: "Granada", city: "Granada", espnId: 3747 },
  { abbr: "HUE", name: "Huesca", city: "Huesca", espnId: 5413 },
  { abbr: "LEG", name: "Leganés", city: "Leganés", espnId: 17534 },
  { abbr: "LEV", name: "Levante", city: "Levante", espnId: 1538 },
  { abbr: "LPA", name: "Las Palmas", city: "Las Palmas", espnId: 98 },
  { abbr: "MCF", name: "Málaga", city: "Málaga", espnId: 99 },
  { abbr: "MLL", name: "Mallorca", city: "Mallorca", espnId: 84 },
  { abbr: "OSA", name: "Osasuna", city: "Osasuna", espnId: 97 },
  { abbr: "OVI", name: "Real Oviedo", city: "Oviedo", espnId: 92 },
  { abbr: "RAY", name: "Rayo Vallecano", city: "Rayo", espnId: 101 },
  { abbr: "RMA", name: "Real Madrid", city: "Real Madrid", espnId: 86 },
  { abbr: "RSO", name: "Real Sociedad", city: "Real Sociedad", espnId: 89 },
  { abbr: "SEV", name: "Sevilla", city: "Sevilla", espnId: 243 },
  { abbr: "SPO", name: "Sporting Gijón", city: "Sporting", espnId: 3788 },
  { abbr: "VAL", name: "Valencia", city: "Valencia", espnId: 94 },
  { abbr: "VIL", name: "Villarreal", city: "Villarreal", espnId: 102 },
  { abbr: "VLL", name: "Real Valladolid", city: "Valladolid", espnId: 95 },
];

export const LALIGA_TEAM_ABBRS = LALIGA_TEAMS.map((t) => t.abbr);

const teamByAbbr = new Map(LALIGA_TEAMS.map((t) => [t.abbr, t]));

/** Game-log abbreviations that differ from the canonical registry key. */
const ABBR_ALIASES: Record<string, string> = {
  GRA: "GRN",
};

const FOOTBALL_DATA_ALIASES: Record<string, string> = {
  alaves: "ALA",
  almeria: "ALM",
  "ath bilbao": "ATH",
  "ath madrid": "ATM",
  barcelona: "BAR",
  betis: "BET",
  cadiz: "CAD",
  celta: "CEL",
  "la coruna": "DEP",
  eibar: "EIB",
  elche: "ELC",
  espanol: "ESP",
  getafe: "GET",
  girona: "GIR",
  granada: "GRN",
  huesca: "HUE",
  leganes: "LEG",
  levante: "LEV",
  "las palmas": "LPA",
  malaga: "MCF",
  mallorca: "MLL",
  osasuna: "OSA",
  oviedo: "OVI",
  "real madrid": "RMA",
  sevilla: "SEV",
  sociedad: "RSO",
  "sp gijon": "SPO",
  valencia: "VAL",
  valladolid: "VLL",
  vallecano: "RAY",
  villarreal: "VIL",
};

export function getTeam(abbr: string): LaligaTeam | undefined {
  const key = ABBR_ALIASES[abbr.toUpperCase()] ?? abbr.toUpperCase();
  return teamByAbbr.get(key);
}

export function getTeamOrThrow(abbr: string): LaligaTeam {
  const t = getTeam(abbr);
  if (!t) throw new Error(`Unknown team: ${abbr}`);
  return t;
}

export function teamFullName(team: LaligaTeam): string {
  return team.name;
}

export function teamWithArticle(team: LaligaTeam): string {
  return team.name;
}

export function teamLogoUrl(abbr: string): string {
  const team = getTeam(abbr);
  if (!team || team.espnId <= 0) return "";
  return `https://a.espncdn.com/i/teamlogos/soccer/500/${team.espnId}.png`;
}

export function matchTeamString(team: string): LaligaTeam | undefined {
  const n = team.trim().toLowerCase();
  if (!n) return undefined;
  const alias = FOOTBALL_DATA_ALIASES[n];
  const direct = teamByAbbr.get((alias ?? n).toUpperCase());
  if (direct) return direct;
  for (const t of LALIGA_TEAMS) {
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

export function detectTeamsInGame(awayTeam: string, homeTeam: string): LaligaTeam[] {
  const out: LaligaTeam[] = [];
  for (const raw of [awayTeam, homeTeam]) {
    const m = matchTeamString(raw);
    if (m && !out.some((t) => t.abbr === m.abbr)) out.push(m);
  }
  return out;
}
