export interface NbaTeam {
  abbr: string;
  name: string;
  city: string;
  nbaId: number;
  conference: "East" | "West";
  division: string;
}

/** All 30 NBA teams, abbr is the canonical key for routes and data. */
export const NBA_TEAMS: NbaTeam[] = [
  { abbr: "ATL", name: "Hawks", city: "Atlanta", nbaId: 1610612737, conference: "East", division: "Southeast" },
  { abbr: "BOS", name: "Celtics", city: "Boston", nbaId: 1610612738, conference: "East", division: "Atlantic" },
  { abbr: "BKN", name: "Nets", city: "Brooklyn", nbaId: 1610612751, conference: "East", division: "Atlantic" },
  { abbr: "CHA", name: "Hornets", city: "Charlotte", nbaId: 1610612766, conference: "East", division: "Southeast" },
  { abbr: "CHI", name: "Bulls", city: "Chicago", nbaId: 1610612741, conference: "East", division: "Central" },
  { abbr: "CLE", name: "Cavaliers", city: "Cleveland", nbaId: 1610612739, conference: "East", division: "Central" },
  { abbr: "DAL", name: "Mavericks", city: "Dallas", nbaId: 1610612742, conference: "West", division: "Southwest" },
  { abbr: "DEN", name: "Nuggets", city: "Denver", nbaId: 1610612743, conference: "West", division: "Northwest" },
  { abbr: "DET", name: "Pistons", city: "Detroit", nbaId: 1610612765, conference: "East", division: "Central" },
  { abbr: "GSW", name: "Warriors", city: "Golden State", nbaId: 1610612744, conference: "West", division: "Pacific" },
  { abbr: "HOU", name: "Rockets", city: "Houston", nbaId: 1610612745, conference: "West", division: "Southwest" },
  { abbr: "IND", name: "Pacers", city: "Indiana", nbaId: 1610612754, conference: "East", division: "Central" },
  { abbr: "LAC", name: "Clippers", city: "LA Clippers", nbaId: 1610612746, conference: "West", division: "Pacific" },
  { abbr: "LAL", name: "Lakers", city: "Los Angeles", nbaId: 1610612747, conference: "West", division: "Pacific" },
  { abbr: "MEM", name: "Grizzlies", city: "Memphis", nbaId: 1610612763, conference: "West", division: "Southwest" },
  { abbr: "MIA", name: "Heat", city: "Miami", nbaId: 1610612748, conference: "East", division: "Southeast" },
  { abbr: "MIL", name: "Bucks", city: "Milwaukee", nbaId: 1610612749, conference: "East", division: "Central" },
  { abbr: "MIN", name: "Timberwolves", city: "Minnesota", nbaId: 1610612750, conference: "West", division: "Northwest" },
  { abbr: "NOP", name: "Pelicans", city: "New Orleans", nbaId: 1610612740, conference: "West", division: "Southwest" },
  { abbr: "NYK", name: "Knicks", city: "New York", nbaId: 1610612752, conference: "East", division: "Atlantic" },
  { abbr: "OKC", name: "Thunder", city: "Oklahoma City", nbaId: 1610612760, conference: "West", division: "Northwest" },
  { abbr: "ORL", name: "Magic", city: "Orlando", nbaId: 1610612753, conference: "East", division: "Southeast" },
  { abbr: "PHI", name: "76ers", city: "Philadelphia", nbaId: 1610612755, conference: "East", division: "Atlantic" },
  { abbr: "PHX", name: "Suns", city: "Phoenix", nbaId: 1610612756, conference: "West", division: "Pacific" },
  { abbr: "POR", name: "Trail Blazers", city: "Portland", nbaId: 1610612757, conference: "West", division: "Northwest" },
  { abbr: "SAC", name: "Kings", city: "Sacramento", nbaId: 1610612758, conference: "West", division: "Pacific" },
  { abbr: "SAS", name: "Spurs", city: "San Antonio", nbaId: 1610612759, conference: "West", division: "Southwest" },
  { abbr: "TOR", name: "Raptors", city: "Toronto", nbaId: 1610612761, conference: "East", division: "Atlantic" },
  { abbr: "UTA", name: "Jazz", city: "Utah", nbaId: 1610612762, conference: "West", division: "Northwest" },
  { abbr: "WAS", name: "Wizards", city: "Washington", nbaId: 1610612764, conference: "East", division: "Southeast" },
];

export const NBA_TEAM_ABBRS = NBA_TEAMS.map((t) => t.abbr);

const teamByAbbr = new Map(NBA_TEAMS.map((t) => [t.abbr, t]));

export function getTeam(abbr: string): NbaTeam | undefined {
  return teamByAbbr.get(abbr.toUpperCase());
}

export function getTeamOrThrow(abbr: string): NbaTeam {
  const team = getTeam(abbr);
  if (!team) throw new Error(`Unknown team abbr: ${abbr}`);
  return team;
}

export function teamFullName(team: NbaTeam): string {
  if (team.abbr === "LAC") return "LA Clippers";
  if (team.abbr === "GSW") return "Golden State Warriors";
  return `${team.city} ${team.name}`;
}

/** e.g. "the Raptors", "the Lakers", "the 76ers" */
export function teamWithArticle(team: NbaTeam): string {
  return `the ${team.name}`;
}

export function teamLogoUrl(nbaId: number): string {
  return `https://cdn.nba.com/logos/nba/${nbaId}/global/L/logo.svg`;
}

/** Match assignment strings like "Toronto", "TOR", "Los Angeles Lakers", etc. */
export function matchTeamString(team: string): NbaTeam | undefined {
  const normalized = team.trim().toLowerCase();
  if (!normalized) return undefined;

  const direct = teamByAbbr.get(normalized.toUpperCase());
  if (direct) return direct;

  for (const t of NBA_TEAMS) {
    const full = teamFullName(t).toLowerCase();
    const short = `${t.city} ${t.name}`.toLowerCase();
    if (
      normalized === full ||
      normalized === short ||
      normalized.includes(t.name.toLowerCase()) ||
      normalized.includes(t.city.toLowerCase())
    ) {
      return t;
    }
  }

  return undefined;
}

export function detectTeamsInGame(
  awayTeam: string,
  homeTeam: string,
): NbaTeam[] {
  const teams: NbaTeam[] = [];
  for (const raw of [awayTeam, homeTeam]) {
    const match = matchTeamString(raw);
    if (match && !teams.some((t) => t.abbr === match.abbr)) {
      teams.push(match);
    }
  }
  return teams;
}

export function teamsByConference(): {
  East: NbaTeam[];
  West: NbaTeam[];
} {
  return {
    East: NBA_TEAMS.filter((t) => t.conference === "East"),
    West: NBA_TEAMS.filter((t) => t.conference === "West"),
  };
}
