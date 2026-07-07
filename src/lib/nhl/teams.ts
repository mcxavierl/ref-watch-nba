export interface NhlTeam {
  abbr: string;
  name: string;
  city: string;
  conference: "East" | "West";
  division: string;
}

/** All 32 NHL teams — abbr is the canonical key for routes and data. */
export const NHL_TEAMS: NhlTeam[] = [
  { abbr: "ANA", name: "Ducks", city: "Anaheim", conference: "West", division: "Pacific" },
  { abbr: "BOS", name: "Bruins", city: "Boston", conference: "East", division: "Atlantic" },
  { abbr: "BUF", name: "Sabres", city: "Buffalo", conference: "East", division: "Atlantic" },
  { abbr: "CAR", name: "Hurricanes", city: "Carolina", conference: "East", division: "Metropolitan" },
  { abbr: "CBJ", name: "Blue Jackets", city: "Columbus", conference: "East", division: "Metropolitan" },
  { abbr: "CGY", name: "Flames", city: "Calgary", conference: "West", division: "Pacific" },
  { abbr: "CHI", name: "Blackhawks", city: "Chicago", conference: "West", division: "Central" },
  { abbr: "COL", name: "Avalanche", city: "Colorado", conference: "West", division: "Central" },
  { abbr: "DAL", name: "Stars", city: "Dallas", conference: "West", division: "Central" },
  { abbr: "DET", name: "Red Wings", city: "Detroit", conference: "East", division: "Atlantic" },
  { abbr: "EDM", name: "Oilers", city: "Edmonton", conference: "West", division: "Pacific" },
  { abbr: "FLA", name: "Panthers", city: "Florida", conference: "East", division: "Atlantic" },
  { abbr: "LAK", name: "Kings", city: "Los Angeles", conference: "West", division: "Pacific" },
  { abbr: "MIN", name: "Wild", city: "Minnesota", conference: "West", division: "Central" },
  { abbr: "MTL", name: "Canadiens", city: "Montreal", conference: "East", division: "Atlantic" },
  { abbr: "NSH", name: "Predators", city: "Nashville", conference: "West", division: "Central" },
  { abbr: "NJD", name: "Devils", city: "New Jersey", conference: "East", division: "Metropolitan" },
  { abbr: "NYI", name: "Islanders", city: "New York", conference: "East", division: "Metropolitan" },
  { abbr: "NYR", name: "Rangers", city: "New York", conference: "East", division: "Metropolitan" },
  { abbr: "OTT", name: "Senators", city: "Ottawa", conference: "East", division: "Atlantic" },
  { abbr: "PHI", name: "Flyers", city: "Philadelphia", conference: "East", division: "Metropolitan" },
  { abbr: "PIT", name: "Penguins", city: "Pittsburgh", conference: "East", division: "Metropolitan" },
  { abbr: "SEA", name: "Kraken", city: "Seattle", conference: "West", division: "Pacific" },
  { abbr: "SJS", name: "Sharks", city: "San Jose", conference: "West", division: "Pacific" },
  { abbr: "STL", name: "Blues", city: "St. Louis", conference: "West", division: "Central" },
  { abbr: "TBL", name: "Lightning", city: "Tampa Bay", conference: "East", division: "Atlantic" },
  { abbr: "TOR", name: "Maple Leafs", city: "Toronto", conference: "East", division: "Atlantic" },
  { abbr: "UTA", name: "Hockey Club", city: "Utah", conference: "West", division: "Central" },
  { abbr: "VAN", name: "Canucks", city: "Vancouver", conference: "West", division: "Pacific" },
  { abbr: "VGK", name: "Golden Knights", city: "Vegas", conference: "West", division: "Pacific" },
  { abbr: "WPG", name: "Jets", city: "Winnipeg", conference: "West", division: "Central" },
  { abbr: "WSH", name: "Capitals", city: "Washington", conference: "East", division: "Metropolitan" },
];

export const NHL_TEAM_ABBRS = NHL_TEAMS.map((t) => t.abbr);

const teamByAbbr = new Map(NHL_TEAMS.map((t) => [t.abbr, t]));

export function getTeam(abbr: string): NhlTeam | undefined {
  return teamByAbbr.get(abbr.toUpperCase());
}

export function getTeamOrThrow(abbr: string): NhlTeam {
  const team = getTeam(abbr);
  if (!team) throw new Error(`Unknown team abbr: ${abbr}`);
  return team;
}

export function teamFullName(team: NhlTeam): string {
  if (team.abbr === "UTA") return "Utah Hockey Club";
  if (team.abbr === "LAK") return "Los Angeles Kings";
  if (team.abbr === "NYI") return "New York Islanders";
  if (team.abbr === "NYR") return "New York Rangers";
  if (team.abbr === "SJS") return "San Jose Sharks";
  if (team.abbr === "TBL") return "Tampa Bay Lightning";
  if (team.abbr === "VGK") return "Vegas Golden Knights";
  return `${team.city} ${team.name}`;
}

export function teamWithArticle(team: NhlTeam): string {
  return `the ${team.name}`;
}

export function teamLogoUrl(abbr: string): string {
  return `https://assets.nhle.com/logos/nhl/svg/${abbr.toUpperCase()}_light.svg`;
}

/** Match assignment strings like "Toronto", "TOR", "New Jersey Devils", etc. */
export function matchTeamString(team: string): NhlTeam | undefined {
  const normalized = team.trim().toLowerCase();
  if (!normalized) return undefined;

  const direct = teamByAbbr.get(normalized.toUpperCase());
  if (direct) return direct;

  for (const t of NHL_TEAMS) {
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

  if (normalized.includes("vegas") || normalized.includes("golden knights")) {
    return getTeam("VGK");
  }
  if (normalized.includes("utah")) {
    return getTeam("UTA");
  }

  return undefined;
}

export function detectTeamsInGame(
  awayTeam: string,
  homeTeam: string,
): NhlTeam[] {
  const teams: NhlTeam[] = [];
  for (const raw of [awayTeam, homeTeam]) {
    const match = matchTeamString(raw);
    if (match && !teams.some((t) => t.abbr === match.abbr)) {
      teams.push(match);
    }
  }
  return teams;
}

export function teamsByConference(): {
  East: NhlTeam[];
  West: NhlTeam[];
} {
  return {
    East: NHL_TEAMS.filter((t) => t.conference === "East"),
    West: NHL_TEAMS.filter((t) => t.conference === "West"),
  };
}
