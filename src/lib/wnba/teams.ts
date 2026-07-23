import { normalizeWnbaAbbr, wnbaLogoAbbr } from "@/lib/wnba/abbr";

export interface WnbaTeam {
  abbr: string;
  name: string;
  city: string;
  conference?: "East" | "West";
  /** Optional CDN logo override for TeamLogo. */
  logoUrl?: string;
  /** All-Star roster side without a franchise logo on ESPN CDN. */
  allStar?: boolean;
}

/** All WNBA franchises, abbr is the canonical key for routes and data. */
export const WNBA_TEAMS: WnbaTeam[] = [
  { abbr: "ATL", name: "Dream", city: "Atlanta", conference: "East" },
  { abbr: "CHI", name: "Sky", city: "Chicago", conference: "East" },
  { abbr: "CON", name: "Sun", city: "Connecticut", conference: "East" },
  { abbr: "IND", name: "Fever", city: "Indiana", conference: "East" },
  { abbr: "NYL", name: "Liberty", city: "New York", conference: "East" },
  { abbr: "WAS", name: "Mystics", city: "Washington", conference: "East" },
  { abbr: "DAL", name: "Wings", city: "Dallas", conference: "West" },
  { abbr: "GSV", name: "Valkyries", city: "Golden State", conference: "West" },
  { abbr: "LAS", name: "Sparks", city: "Los Angeles", conference: "West" },
  { abbr: "LVA", name: "Aces", city: "Las Vegas", conference: "West" },
  { abbr: "MIN", name: "Lynx", city: "Minnesota", conference: "West" },
  { abbr: "PHO", name: "Mercury", city: "Phoenix", conference: "West" },
  { abbr: "SEA", name: "Storm", city: "Seattle", conference: "West" },
  { abbr: "TOR", name: "Tempo", city: "Toronto", conference: "East" },
  { abbr: "POR", name: "Fire", city: "Portland", conference: "West" },
];

/** ESPN All-Star sides (e.g. Team Spoon vs Team Coop) with no franchise CDN logos. */
export const WNBA_ALLSTAR_TEAMS: WnbaTeam[] = [
  { abbr: "SPO", name: "Spoon", city: "Team", allStar: true },
  { abbr: "COOP", name: "Coop", city: "Team", allStar: true },
];

export const WNBA_TEAM_ABBRS = WNBA_TEAMS.map((t) => t.abbr);

const franchiseAbbrs = new Set(WNBA_TEAMS.map((t) => t.abbr));
const teamByAbbr = new Map(
  [...WNBA_TEAMS, ...WNBA_ALLSTAR_TEAMS].map((t) => [t.abbr, t]),
);

export function getTeam(abbr: string): WnbaTeam | undefined {
  return teamByAbbr.get(abbr.toUpperCase());
}

export function getTeamOrThrow(abbr: string): WnbaTeam {
  const team = getTeam(abbr);
  if (!team) throw new Error(`Unknown WNBA team abbr: ${abbr}`);
  return team;
}

export function teamFullName(team: WnbaTeam): string {
  if (team.allStar) return `${team.city} ${team.name}`;
  if (team.abbr === "NYL") return "New York Liberty";
  if (team.abbr === "LVA") return "Las Vegas Aces";
  if (team.abbr === "LAS") return "Los Angeles Sparks";
  if (team.abbr === "GSV") return "Golden State Valkyries";
  return `${team.city} ${team.name}`;
}

export function teamWithArticle(team: WnbaTeam): string {
  return `the ${team.name}`;
}

/** Resolve official city names, nicknames, or ESPN keys to canonical 3-letter abbrs. */
export function resolveWnbaTeamAbbr(team: string): string {
  const matched = matchTeamString(team);
  if (matched) return matched.abbr;
  return normalizeWnbaAbbr(team.trim().toUpperCase());
}

export function teamLogoUrl(abbr: string, uiSurface: "dark" | "light" = "dark"): string {
  const canonical = normalizeWnbaAbbr(abbr);
  const team = getTeam(canonical);
  if (team?.logoUrl) return team.logoUrl;
  if (team?.allStar || !franchiseAbbrs.has(canonical)) return "";
  const slug = wnbaLogoAbbr(canonical);
  const folder = uiSurface === "dark" ? "500-dark" : "500";
  return `https://a.espncdn.com/i/teamlogos/wnba/${folder}/${slug}.png`;
}

/** Match assignment strings like "Las Vegas", "LVA", "Aces", etc. */
export function matchTeamString(team: string): WnbaTeam | undefined {
  const normalized = team.trim().toLowerCase();
  if (!normalized) return undefined;

  const direct = teamByAbbr.get(normalized.toUpperCase());
  if (direct) return direct;

  for (const t of WNBA_TEAMS) {
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

  if (normalized.includes("vegas") || normalized.includes("aces")) {
    return getTeam("LVA");
  }
  if (normalized.includes("valkyries") || normalized.includes("golden state")) {
    return getTeam("GSV");
  }
  if (normalized.includes("team spoon") || normalized.includes("spoon")) {
    return getTeam("SPO");
  }
  if (normalized.includes("team coop") || normalized === "coop") {
    return getTeam("COOP");
  }

  return undefined;
}

export function detectTeamsInGame(
  awayTeam: string,
  homeTeam: string,
): WnbaTeam[] {
  const teams: WnbaTeam[] = [];
  for (const raw of [awayTeam, homeTeam]) {
    const match = matchTeamString(raw);
    if (match && !teams.some((t) => t.abbr === match.abbr)) {
      teams.push(match);
    }
  }
  return teams;
}

export function teamsByConference(): {
  East: WnbaTeam[];
  West: WnbaTeam[];
} {
  return {
    East: WNBA_TEAMS.filter((t) => t.conference === "East"),
    West: WNBA_TEAMS.filter((t) => t.conference === "West"),
  };
}
