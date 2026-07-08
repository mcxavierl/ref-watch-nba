export interface NflTeam { abbr: string; name: string; city: string; conference: "AFC" | "NFC"; division: string; }
export const NFL_TEAMS: NflTeam[] = [
  { abbr: "ARI", name: "Cardinals", city: "Arizona", conference: "NFC", division: "West" },
  { abbr: "ATL", name: "Falcons", city: "Atlanta", conference: "NFC", division: "South" },
  { abbr: "BAL", name: "Ravens", city: "Baltimore", conference: "AFC", division: "North" },
  { abbr: "BUF", name: "Bills", city: "Buffalo", conference: "AFC", division: "East" },
  { abbr: "CAR", name: "Panthers", city: "Carolina", conference: "NFC", division: "South" },
  { abbr: "CHI", name: "Bears", city: "Chicago", conference: "NFC", division: "North" },
  { abbr: "CIN", name: "Bengals", city: "Cincinnati", conference: "AFC", division: "North" },
  { abbr: "CLE", name: "Browns", city: "Cleveland", conference: "AFC", division: "North" },
  { abbr: "DAL", name: "Cowboys", city: "Dallas", conference: "NFC", division: "East" },
  { abbr: "DEN", name: "Broncos", city: "Denver", conference: "AFC", division: "West" },
  { abbr: "DET", name: "Lions", city: "Detroit", conference: "NFC", division: "North" },
  { abbr: "GB", name: "Packers", city: "Green Bay", conference: "NFC", division: "North" },
  { abbr: "HOU", name: "Texans", city: "Houston", conference: "AFC", division: "South" },
  { abbr: "IND", name: "Colts", city: "Indianapolis", conference: "AFC", division: "South" },
  { abbr: "JAX", name: "Jaguars", city: "Jacksonville", conference: "AFC", division: "South" },
  { abbr: "KC", name: "Chiefs", city: "Kansas City", conference: "AFC", division: "West" },
  { abbr: "LAC", name: "Chargers", city: "Los Angeles", conference: "AFC", division: "West" },
  { abbr: "LAR", name: "Rams", city: "Los Angeles", conference: "NFC", division: "West" },
  { abbr: "LV", name: "Raiders", city: "Las Vegas", conference: "AFC", division: "West" },
  { abbr: "MIA", name: "Dolphins", city: "Miami", conference: "AFC", division: "East" },
  { abbr: "MIN", name: "Vikings", city: "Minnesota", conference: "NFC", division: "North" },
  { abbr: "NE", name: "Patriots", city: "New England", conference: "AFC", division: "East" },
  { abbr: "NO", name: "Saints", city: "New Orleans", conference: "NFC", division: "South" },
  { abbr: "NYG", name: "Giants", city: "New York", conference: "NFC", division: "East" },
  { abbr: "NYJ", name: "Jets", city: "New York", conference: "AFC", division: "East" },
  { abbr: "PHI", name: "Eagles", city: "Philadelphia", conference: "NFC", division: "East" },
  { abbr: "PIT", name: "Steelers", city: "Pittsburgh", conference: "AFC", division: "North" },
  { abbr: "SEA", name: "Seahawks", city: "Seattle", conference: "NFC", division: "West" },
  { abbr: "SF", name: "49ers", city: "San Francisco", conference: "NFC", division: "West" },
  { abbr: "TB", name: "Buccaneers", city: "Tampa Bay", conference: "NFC", division: "South" },
  { abbr: "TEN", name: "Titans", city: "Tennessee", conference: "AFC", division: "South" },
  { abbr: "WAS", name: "Commanders", city: "Washington", conference: "NFC", division: "East" },
];
export const NFL_TEAM_ABBRS = NFL_TEAMS.map((t) => t.abbr);
const teamByAbbr = new Map(NFL_TEAMS.map((t) => [t.abbr, t]));
export function getTeam(abbr: string): NflTeam | undefined { return teamByAbbr.get(abbr.toUpperCase()); }
export function getTeamOrThrow(abbr: string): NflTeam { const t = getTeam(abbr); if (!t) throw new Error(`Unknown team: ${abbr}`); return t; }
export function teamFullName(team: NflTeam): string { return `${team.city} ${team.name}`; }
export function teamWithArticle(team: NflTeam): string { return `the ${team.name}`; }
export function teamLogoUrl(abbr: string): string { return `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${abbr.toUpperCase()}`; }
export function matchTeamString(team: string): NflTeam | undefined {
  const n = team.trim().toLowerCase(); if (!n) return undefined;
  const d = teamByAbbr.get(n.toUpperCase()); if (d) return d;
  for (const t of NFL_TEAMS) { const full = teamFullName(t).toLowerCase(); if (n === full || n.includes(t.name.toLowerCase()) || n.includes(t.city.toLowerCase())) return t; }
  return undefined;
}
export function detectTeamsInGame(awayTeam: string, homeTeam: string): NflTeam[] { const out: NflTeam[] = []; for (const raw of [awayTeam, homeTeam]) { const m = matchTeamString(raw); if (m && !out.some((t) => t.abbr === m.abbr)) out.push(m); } return out; }
export function teamsByConference(): { AFC: NflTeam[]; NFC: NflTeam[] } { return { AFC: NFL_TEAMS.filter((t) => t.conference === "AFC"), NFC: NFL_TEAMS.filter((t) => t.conference === "NFC") }; }
