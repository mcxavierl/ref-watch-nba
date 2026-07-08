export interface CbbTeam {
  abbr: string;
  name: string;
  city: string;
  conference: "ACC" | "Big Ten" | "Big 12" | "SEC" | "Big East" | "Pac-12" | "Other";
  division: string;
}

/** Representative D-I men's basketball programs for Phase 1 scaffold. */
export const CBB_TEAMS: CbbTeam[] = [
  { abbr: "DUKE", name: "Blue Devils", city: "Duke", conference: "ACC", division: "Atlantic" },
  { abbr: "UNC", name: "Tar Heels", city: "North Carolina", conference: "ACC", division: "Atlantic" },
  { abbr: "UK", name: "Wildcats", city: "Kentucky", conference: "SEC", division: "East" },
  { abbr: "KU", name: "Jayhawks", city: "Kansas", conference: "Big 12", division: "-" },
  { abbr: "GONZ", name: "Bulldogs", city: "Gonzaga", conference: "Other", division: "WCC" },
  { abbr: "UCLA", name: "Bruins", city: "UCLA", conference: "Big Ten", division: "-" },
  { abbr: "MICH", name: "Wolverines", city: "Michigan", conference: "Big Ten", division: "East" },
  { abbr: "PUR", name: "Boilermakers", city: "Purdue", conference: "Big Ten", division: "West" },
  { abbr: "IU", name: "Hoosiers", city: "Indiana", conference: "Big Ten", division: "East" },
  { abbr: "OSU", name: "Buckeyes", city: "Ohio State", conference: "Big Ten", division: "East" },
  { abbr: "MSU", name: "Spartans", city: "Michigan State", conference: "Big Ten", division: "East" },
  { abbr: "UCONN", name: "Huskies", city: "UConn", conference: "Big East", division: "-" },
  { abbr: "VILL", name: "Wildcats", city: "Villanova", conference: "Big East", division: "-" },
  { abbr: "ARIZ", name: "Wildcats", city: "Arizona", conference: "Big 12", division: "-" },
  { abbr: "BAY", name: "Bears", city: "Baylor", conference: "Big 12", division: "-" },
  { abbr: "HOU", name: "Cougars", city: "Houston", conference: "Big 12", division: "-" },
  { abbr: "TENN", name: "Volunteers", city: "Tennessee", conference: "SEC", division: "East" },
  { abbr: "ALA", name: "Crimson Tide", city: "Alabama", conference: "SEC", division: "West" },
  { abbr: "AUB", name: "Tigers", city: "Auburn", conference: "SEC", division: "West" },
  { abbr: "FLA", name: "Gators", city: "Florida", conference: "SEC", division: "East" },
  { abbr: "LOU", name: "Cardinals", city: "Louisville", conference: "ACC", division: "Atlantic" },
  { abbr: "SYR", name: "Orange", city: "Syracuse", conference: "ACC", division: "Atlantic" },
  { abbr: "CREI", name: "Bluejays", city: "Creighton", conference: "Big East", division: "-" },
  { abbr: "MARQ", name: "Golden Eagles", city: "Marquette", conference: "Big East", division: "-" },
];

export const CBB_TEAM_ABBRS = CBB_TEAMS.map((t) => t.abbr);

const teamByAbbr = new Map(CBB_TEAMS.map((t) => [t.abbr, t]));

export function getTeam(abbr: string): CbbTeam | undefined {
  return teamByAbbr.get(abbr.toUpperCase());
}

export function getTeamOrThrow(abbr: string): CbbTeam {
  const t = getTeam(abbr);
  if (!t) throw new Error(`Unknown team: ${abbr}`);
  return t;
}

export function teamFullName(team: CbbTeam): string {
  return `${team.city} ${team.name}`;
}

export function teamWithArticle(team: CbbTeam): string {
  return `the ${team.name}`;
}

export function teamLogoUrl(_abbr: string): string {
  return "";
}

export function matchTeamString(team: string): CbbTeam | undefined {
  const n = team.trim().toLowerCase();
  if (!n) return undefined;
  const direct = teamByAbbr.get(n.toUpperCase());
  if (direct) return direct;
  for (const t of CBB_TEAMS) {
    const full = teamFullName(t).toLowerCase();
    if (n === full || n.includes(t.name.toLowerCase()) || n.includes(t.city.toLowerCase())) {
      return t;
    }
  }
  return undefined;
}

export function detectTeamsInGame(awayTeam: string, homeTeam: string): CbbTeam[] {
  const out: CbbTeam[] = [];
  for (const raw of [awayTeam, homeTeam]) {
    const m = matchTeamString(raw);
    if (m && !out.some((t) => t.abbr === m.abbr)) out.push(m);
  }
  return out;
}

export function teamsByConference(): Record<CbbTeam["conference"], CbbTeam[]> {
  const groups = {} as Record<CbbTeam["conference"], CbbTeam[]>;
  for (const t of CBB_TEAMS) {
    (groups[t.conference] ??= []).push(t);
  }
  return groups;
}
