import { CFB_ESPN_TEAM_IDS } from "@/lib/cfb/team-ids";

export interface CfbTeam {
  abbr: string;
  name: string;
  city: string;
  conference: "SEC" | "Big Ten" | "Big 12" | "ACC" | "Pac-12" | "Other";
  division: string;
}

/** Representative FBS programs for Phase 1 scaffold. */
export const CFB_TEAMS: CfbTeam[] = [
  { abbr: "ALA", name: "Crimson Tide", city: "Alabama", conference: "SEC", division: "West" },
  { abbr: "UGA", name: "Bulldogs", city: "Georgia", conference: "SEC", division: "East" },
  { abbr: "LSU", name: "Tigers", city: "LSU", conference: "SEC", division: "West" },
  { abbr: "TEX", name: "Longhorns", city: "Texas", conference: "SEC", division: "West" },
  { abbr: "OU", name: "Sooners", city: "Oklahoma", conference: "SEC", division: "West" },
  { abbr: "OSU", name: "Buckeyes", city: "Ohio State", conference: "Big Ten", division: "East" },
  { abbr: "MICH", name: "Wolverines", city: "Michigan", conference: "Big Ten", division: "East" },
  { abbr: "PSU", name: "Nittany Lions", city: "Penn State", conference: "Big Ten", division: "East" },
  { abbr: "ORE", name: "Ducks", city: "Oregon", conference: "Big Ten", division: "West" },
  { abbr: "USC", name: "Trojans", city: "USC", conference: "Big Ten", division: "West" },
  { abbr: "CLEM", name: "Tigers", city: "Clemson", conference: "ACC", division: "Atlantic" },
  { abbr: "FSU", name: "Seminoles", city: "Florida State", conference: "ACC", division: "Atlantic" },
  { abbr: "MIA", name: "Hurricanes", city: "Miami", conference: "ACC", division: "Coastal" },
  { abbr: "ND", name: "Fighting Irish", city: "Notre Dame", conference: "Other", division: "Independent" },
  { abbr: "TENN", name: "Volunteers", city: "Tennessee", conference: "SEC", division: "East" },
  { abbr: "FLA", name: "Gators", city: "Florida", conference: "SEC", division: "East" },
  { abbr: "AUB", name: "Tigers", city: "Auburn", conference: "SEC", division: "West" },
  { abbr: "WASH", name: "Huskies", city: "Washington", conference: "Big Ten", division: "West" },
  { abbr: "UTAH", name: "Utes", city: "Utah", conference: "Big 12", division: "-" },
  { abbr: "KSU", name: "Wildcats", city: "Kansas State", conference: "Big 12", division: "-" },
  { abbr: "TCU", name: "Horned Frogs", city: "TCU", conference: "Big 12", division: "-" },
  { abbr: "BYU", name: "Cougars", city: "BYU", conference: "Big 12", division: "-" },
  { abbr: "LOU", name: "Cardinals", city: "Louisville", conference: "ACC", division: "Atlantic" },
  { abbr: "WIS", name: "Badgers", city: "Wisconsin", conference: "Big Ten", division: "West" },
];

export const CFB_TEAM_ABBRS = CFB_TEAMS.map((t) => t.abbr);

const teamByAbbr = new Map(CFB_TEAMS.map((t) => [t.abbr, t]));

export function getTeam(abbr: string): CfbTeam | undefined {
  return teamByAbbr.get(abbr.toUpperCase());
}

export function getTeamOrThrow(abbr: string): CfbTeam {
  const t = getTeam(abbr);
  if (!t) throw new Error(`Unknown team: ${abbr}`);
  return t;
}

export function teamFullName(team: CfbTeam): string {
  return `${team.city} ${team.name}`;
}

export function teamWithArticle(team: CfbTeam): string {
  return `the ${team.name}`;
}

export function teamLogoUrl(abbr: string): string {
  const id = CFB_ESPN_TEAM_IDS[abbr.toUpperCase()];
  if (!id) return "";
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
}

export function matchTeamString(team: string): CfbTeam | undefined {
  const n = team.trim().toLowerCase();
  if (!n) return undefined;
  const direct = teamByAbbr.get(n.toUpperCase());
  if (direct) return direct;
  for (const t of CFB_TEAMS) {
    const full = teamFullName(t).toLowerCase();
    if (n === full || n.includes(t.name.toLowerCase()) || n.includes(t.city.toLowerCase())) {
      return t;
    }
  }
  return undefined;
}

export function detectTeamsInGame(awayTeam: string, homeTeam: string): CfbTeam[] {
  const out: CfbTeam[] = [];
  for (const raw of [awayTeam, homeTeam]) {
    const m = matchTeamString(raw);
    if (m && !out.some((t) => t.abbr === m.abbr)) out.push(m);
  }
  return out;
}

export function teamsByConference(): Record<CfbTeam["conference"], CfbTeam[]> {
  const groups = {} as Record<CfbTeam["conference"], CfbTeam[]>;
  for (const t of CFB_TEAMS) {
    (groups[t.conference] ??= []).push(t);
  }
  return groups;
}
