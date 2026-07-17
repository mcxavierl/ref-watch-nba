import { CBB_ESPN_TEAM_IDS } from "@/lib/cbb/team-ids";

export interface CbbTeam {
  abbr: string;
  name: string;
  city: string;
  conference: "ACC" | "Big Ten" | "Big 12" | "SEC" | "Big East" | "Pac-12" | "Other";
  division: string;
}

/** Power-conference D-I men's basketball programs for live coverage. */
export const CBB_TEAMS: CbbTeam[] = [
  { abbr: "ILL", name: "Fighting Illini", city: "Illinois", conference: "Big Ten", division: "-" },
  { abbr: "IU", name: "Hoosiers", city: "Indiana", conference: "Big Ten", division: "East" },
  { abbr: "IOWA", name: "Hawkeyes", city: "Iowa", conference: "Big Ten", division: "-" },
  { abbr: "MD", name: "Terrapins", city: "Maryland", conference: "Big Ten", division: "East" },
  { abbr: "MICH", name: "Wolverines", city: "Michigan", conference: "Big Ten", division: "East" },
  { abbr: "MSU", name: "Spartans", city: "Michigan State", conference: "Big Ten", division: "East" },
  { abbr: "MINN", name: "Golden Gophers", city: "Minnesota", conference: "Big Ten", division: "-" },
  { abbr: "NEB", name: "Cornhuskers", city: "Nebraska", conference: "Big Ten", division: "-" },
  { abbr: "NU", name: "Wildcats", city: "Northwestern", conference: "Big Ten", division: "-" },
  { abbr: "OSU", name: "Buckeyes", city: "Ohio State", conference: "Big Ten", division: "East" },
  { abbr: "ORE", name: "Ducks", city: "Oregon", conference: "Big Ten", division: "West" },
  { abbr: "PSU", name: "Nittany Lions", city: "Penn State", conference: "Big Ten", division: "East" },
  { abbr: "PUR", name: "Boilermakers", city: "Purdue", conference: "Big Ten", division: "West" },
  { abbr: "RUTG", name: "Scarlet Knights", city: "Rutgers", conference: "Big Ten", division: "East" },
  { abbr: "UCLA", name: "Bruins", city: "UCLA", conference: "Big Ten", division: "West" },
  { abbr: "USC", name: "Trojans", city: "USC", conference: "Big Ten", division: "West" },
  { abbr: "WASH", name: "Huskies", city: "Washington", conference: "Big Ten", division: "West" },
  { abbr: "WIS", name: "Badgers", city: "Wisconsin", conference: "Big Ten", division: "West" },
  { abbr: "BC", name: "Eagles", city: "Boston College", conference: "ACC", division: "Atlantic" },
  { abbr: "CAL", name: "Golden Bears", city: "California", conference: "ACC", division: "-" },
  { abbr: "CLEM", name: "Tigers", city: "Clemson", conference: "ACC", division: "Atlantic" },
  { abbr: "DUKE", name: "Blue Devils", city: "Duke", conference: "ACC", division: "Atlantic" },
  { abbr: "FSU", name: "Seminoles", city: "Florida State", conference: "ACC", division: "Atlantic" },
  { abbr: "GT", name: "Yellow Jackets", city: "Georgia Tech", conference: "ACC", division: "Coastal" },
  { abbr: "LOU", name: "Cardinals", city: "Louisville", conference: "ACC", division: "Atlantic" },
  { abbr: "MIA", name: "Hurricanes", city: "Miami", conference: "ACC", division: "Coastal" },
  { abbr: "NCSU", name: "Wolfpack", city: "NC State", conference: "ACC", division: "Atlantic" },
  { abbr: "UNC", name: "Tar Heels", city: "North Carolina", conference: "ACC", division: "Atlantic" },
  { abbr: "ND", name: "Fighting Irish", city: "Notre Dame", conference: "ACC", division: "-" },
  { abbr: "PITT", name: "Panthers", city: "Pittsburgh", conference: "ACC", division: "Coastal" },
  { abbr: "SMU", name: "Mustangs", city: "SMU", conference: "ACC", division: "-" },
  { abbr: "STAN", name: "Cardinal", city: "Stanford", conference: "ACC", division: "-" },
  { abbr: "SYR", name: "Orange", city: "Syracuse", conference: "ACC", division: "Atlantic" },
  { abbr: "UVA", name: "Cavaliers", city: "Virginia", conference: "ACC", division: "Coastal" },
  { abbr: "VT", name: "Hokies", city: "Virginia Tech", conference: "ACC", division: "Coastal" },
  { abbr: "WAKE", name: "Demon Deacons", city: "Wake Forest", conference: "ACC", division: "Atlantic" },
  { abbr: "ALA", name: "Crimson Tide", city: "Alabama", conference: "SEC", division: "West" },
  { abbr: "ARK", name: "Razorbacks", city: "Arkansas", conference: "SEC", division: "West" },
  { abbr: "AUB", name: "Tigers", city: "Auburn", conference: "SEC", division: "West" },
  { abbr: "FLA", name: "Gators", city: "Florida", conference: "SEC", division: "East" },
  { abbr: "UGA", name: "Bulldogs", city: "Georgia", conference: "SEC", division: "East" },
  { abbr: "UK", name: "Wildcats", city: "Kentucky", conference: "SEC", division: "East" },
  { abbr: "LSU", name: "Tigers", city: "LSU", conference: "SEC", division: "West" },
  { abbr: "MISS", name: "Rebels", city: "Ole Miss", conference: "SEC", division: "West" },
  { abbr: "MSST", name: "Bulldogs", city: "Mississippi State", conference: "SEC", division: "West" },
  { abbr: "MIZ", name: "Tigers", city: "Missouri", conference: "SEC", division: "East" },
  { abbr: "OU", name: "Sooners", city: "Oklahoma", conference: "SEC", division: "West" },
  { abbr: "SC", name: "Gamecocks", city: "South Carolina", conference: "SEC", division: "East" },
  { abbr: "TENN", name: "Volunteers", city: "Tennessee", conference: "SEC", division: "East" },
  { abbr: "TEX", name: "Longhorns", city: "Texas", conference: "SEC", division: "West" },
  { abbr: "TA&M", name: "Aggies", city: "Texas A&M", conference: "SEC", division: "West" },
  { abbr: "VAN", name: "Commodores", city: "Vanderbilt", conference: "SEC", division: "East" },
  { abbr: "ARIZ", name: "Wildcats", city: "Arizona", conference: "Big 12", division: "-" },
  { abbr: "ASU", name: "Sun Devils", city: "Arizona State", conference: "Big 12", division: "-" },
  { abbr: "BAY", name: "Bears", city: "Baylor", conference: "Big 12", division: "-" },
  { abbr: "BYU", name: "Cougars", city: "BYU", conference: "Big 12", division: "-" },
  { abbr: "UCF", name: "Knights", city: "UCF", conference: "Big 12", division: "-" },
  { abbr: "CIN", name: "Bearcats", city: "Cincinnati", conference: "Big 12", division: "-" },
  { abbr: "COLO", name: "Buffaloes", city: "Colorado", conference: "Big 12", division: "-" },
  { abbr: "HOU", name: "Cougars", city: "Houston", conference: "Big 12", division: "-" },
  { abbr: "ISU", name: "Cyclones", city: "Iowa State", conference: "Big 12", division: "-" },
  { abbr: "KU", name: "Jayhawks", city: "Kansas", conference: "Big 12", division: "-" },
  { abbr: "KSU", name: "Wildcats", city: "Kansas State", conference: "Big 12", division: "-" },
  { abbr: "OKST", name: "Cowboys", city: "Oklahoma State", conference: "Big 12", division: "-" },
  { abbr: "TCU", name: "Horned Frogs", city: "TCU", conference: "Big 12", division: "-" },
  { abbr: "TTU", name: "Red Raiders", city: "Texas Tech", conference: "Big 12", division: "-" },
  { abbr: "UTAH", name: "Utes", city: "Utah", conference: "Big 12", division: "-" },
  { abbr: "WVU", name: "Mountaineers", city: "West Virginia", conference: "Big 12", division: "-" },
  { abbr: "BUT", name: "Bulldogs", city: "Butler", conference: "Big East", division: "-" },
  { abbr: "UCONN", name: "Huskies", city: "UConn", conference: "Big East", division: "-" },
  { abbr: "CREI", name: "Bluejays", city: "Creighton", conference: "Big East", division: "-" },
  { abbr: "DEP", name: "Blue Demons", city: "DePaul", conference: "Big East", division: "-" },
  { abbr: "GTWN", name: "Hoyas", city: "Georgetown", conference: "Big East", division: "-" },
  { abbr: "MARQ", name: "Golden Eagles", city: "Marquette", conference: "Big East", division: "-" },
  { abbr: "PROV", name: "Friars", city: "Providence", conference: "Big East", division: "-" },
  { abbr: "HALL", name: "Pirates", city: "Seton Hall", conference: "Big East", division: "-" },
  { abbr: "SJU", name: "Red Storm", city: "St. John's", conference: "Big East", division: "-" },
  { abbr: "VILL", name: "Wildcats", city: "Villanova", conference: "Big East", division: "-" },
  { abbr: "XAV", name: "Musketeers", city: "Xavier", conference: "Big East", division: "-" },
  { abbr: "GONZ", name: "Bulldogs", city: "Gonzaga", conference: "Other", division: "WCC" },
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

export function teamLogoUrl(abbr: string): string {
  const id = CBB_ESPN_TEAM_IDS[abbr.toUpperCase()];
  if (!id) return "";
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
}

export function matchTeamString(team: string): CbbTeam | undefined {
  const n = team.trim().toLowerCase();
  if (!n) return undefined;
  const normalized = n === "conn" ? "uconn" : n;
  const direct = teamByAbbr.get(normalized.toUpperCase());
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
