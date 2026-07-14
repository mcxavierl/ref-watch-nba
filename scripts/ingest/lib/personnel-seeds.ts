/**
 * Curated head coaches and star-tier players for friction-matrix joins.
 * Star tier = top ~10% usage per team (ranks 1–3).
 */

export type SeedCoach = {
  coachId: string;
  name: string;
  team: string;
  season: string;
};

export type SeedStar = {
  playerId: string;
  name: string;
  team: string;
  season: string;
  usageRank: number;
  seasonAvgFoulsDrawn?: number;
};

function coachIdFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 10);
  return `${slug}c`;
}

function coach(
  name: string,
  team: string,
  season: string,
): SeedCoach {
  return { coachId: coachIdFromName(name), name, team, season };
}

function star(
  playerId: string,
  name: string,
  team: string,
  season: string,
  usageRank: number,
  seasonAvgFoulsDrawn?: number,
): SeedStar {
  return { playerId, name, team, season, usageRank, seasonAvgFoulsDrawn };
}

const FRICTION_SEASONS = ["2023-24", "2024-25", "2025-26"] as const;

const NFL_COACHES_BY_SEASON: Record<
  (typeof FRICTION_SEASONS)[number],
  Record<string, string>
> = {
  "2023-24": {
    ARI: "Jonathan Gannon",
    ATL: "Arthur Smith",
    BAL: "John Harbaugh",
    BUF: "Sean McDermott",
    CAR: "Frank Reich",
    CHI: "Matt Eberflus",
    CIN: "Zac Taylor",
    CLE: "Kevin Stefanski",
    DAL: "Mike McCarthy",
    DEN: "Sean Payton",
    DET: "Dan Campbell",
    GB: "Matt LaFleur",
    HOU: "DeMeco Ryans",
    IND: "Shane Steichen",
    JAX: "Doug Pederson",
    KC: "Andy Reid",
    LAC: "Brandon Staley",
    LAR: "Sean McVay",
    LV: "Josh McDaniels",
    MIA: "Mike McDaniel",
    MIN: "Kevin O'Connell",
    NE: "Bill Belichick",
    NO: "Dennis Allen",
    NYG: "Brian Daboll",
    NYJ: "Robert Saleh",
    PHI: "Nick Sirianni",
    PIT: "Mike Tomlin",
    SEA: "Pete Carroll",
    SF: "Kyle Shanahan",
    TB: "Todd Bowles",
    TEN: "Mike Vrabel",
    WAS: "Ron Rivera",
  },
  "2024-25": {
    ARI: "Jonathan Gannon",
    ATL: "Raheem Morris",
    BAL: "John Harbaugh",
    BUF: "Sean McDermott",
    CAR: "Dave Canales",
    CHI: "Matt Eberflus",
    CIN: "Zac Taylor",
    CLE: "Kevin Stefanski",
    DAL: "Mike McCarthy",
    DEN: "Sean Payton",
    DET: "Dan Campbell",
    GB: "Matt LaFleur",
    HOU: "DeMeco Ryans",
    IND: "Shane Steichen",
    JAX: "Doug Pederson",
    KC: "Andy Reid",
    LAC: "Jim Harbaugh",
    LAR: "Sean McVay",
    LV: "Antonio Pierce",
    MIA: "Mike McDaniel",
    MIN: "Kevin O'Connell",
    NE: "Jerod Mayo",
    NO: "Dennis Allen",
    NYG: "Brian Daboll",
    NYJ: "Robert Saleh",
    PHI: "Nick Sirianni",
    PIT: "Mike Tomlin",
    SEA: "Mike Macdonald",
    SF: "Kyle Shanahan",
    TB: "Todd Bowles",
    TEN: "Brian Callahan",
    WAS: "Dan Quinn",
  },
  "2025-26": {
    ARI: "Jonathan Gannon",
    ATL: "Raheem Morris",
    BAL: "John Harbaugh",
    BUF: "Sean McDermott",
    CAR: "Dave Canales",
    CHI: "Ben Johnson",
    CIN: "Zac Taylor",
    CLE: "Kevin Stefanski",
    DAL: "Mike McCarthy",
    DEN: "Sean Payton",
    DET: "Dan Campbell",
    GB: "Matt LaFleur",
    HOU: "DeMeco Ryans",
    IND: "Shane Steichen",
    JAX: "Doug Pederson",
    KC: "Andy Reid",
    LAC: "Jim Harbaugh",
    LAR: "Sean McVay",
    LV: "Pete Carroll",
    MIA: "Mike McDaniel",
    MIN: "Kevin O'Connell",
    NE: "Jerod Mayo",
    NO: "Kellen Moore",
    NYG: "Brian Daboll",
    NYJ: "Aaron Glenn",
    PHI: "Nick Sirianni",
    PIT: "Mike Tomlin",
    SEA: "Mike Macdonald",
    SF: "Kyle Shanahan",
    TB: "Todd Bowles",
    TEN: "Brian Callahan",
    WAS: "Dan Quinn",
  },
};

const NHL_COACHES_BY_SEASON: Record<
  (typeof FRICTION_SEASONS)[number],
  Record<string, string>
> = {
  "2023-24": {
    ANA: "Dallas Eakins",
    BOS: "Jim Montgomery",
    BUF: "Don Granato",
    CAR: "Rod Brind'Amour",
    CBJ: "Mike Babcock",
    CGY: "Ryan Huska",
    CHI: "Luke Richardson",
    COL: "Jared Bednar",
    DAL: "Pete DeBoer",
    DET: "Derek Lalonde",
    EDM: "Jay Woodcroft",
    FLA: "Paul Maurice",
    LAK: "Todd McLellan",
    MIN: "Dean Evason",
    MTL: "Martin St. Louis",
    NJD: "Lindy Ruff",
    NSH: "John Hynes",
    NYI: "Lane Lambert",
    NYR: "Peter Laviolette",
    OTT: "D.J. Smith",
    PHI: "John Tortorella",
    PIT: "Mike Sullivan",
    SEA: "Dave Hakstol",
    SJS: "David Quinn",
    STL: "Craig Berube",
    TBL: "Jon Cooper",
    TOR: "Sheldon Keefe",
    UTA: "André Tourigny",
    VAN: "Rick Tocchet",
    VGK: "Bruce Cassidy",
    WPG: "Rick Bowness",
    WSH: "Spencer Carbery",
  },
  "2024-25": {
    ANA: "Greg Cronin",
    BOS: "Jim Montgomery",
    BUF: "Don Granato",
    CAR: "Rod Brind'Amour",
    CBJ: "Dean Evason",
    CGY: "Ryan Huska",
    CHI: "Luke Richardson",
    COL: "Jared Bednar",
    DAL: "Pete DeBoer",
    DET: "Todd McLellan",
    EDM: "Kris Knoblauch",
    FLA: "Paul Maurice",
    LAK: "Jim Hiller",
    MIN: "Dean Evason",
    MTL: "Martin St. Louis",
    NJD: "Sheldon Keefe",
    NSH: "Andrew Brunette",
    NYI: "Patrick Roy",
    NYR: "Peter Laviolette",
    OTT: "Travis Green",
    PHI: "John Tortorella",
    PIT: "Mike Sullivan",
    SEA: "Dan Bylsma",
    SJS: "Ryan Warsofsky",
    STL: "Drew Bannister",
    TBL: "Jon Cooper",
    TOR: "Craig Berube",
    UTA: "André Tourigny",
    VAN: "Rick Tocchet",
    VGK: "Bruce Cassidy",
    WPG: "Scott Arniel",
    WSH: "Spencer Carbery",
  },
  "2025-26": {
    ANA: "Greg Cronin",
    BOS: "Jim Montgomery",
    BUF: "Don Granato",
    CAR: "Rod Brind'Amour",
    CBJ: "Dean Evason",
    CGY: "Ryan Huska",
    CHI: "Luke Richardson",
    COL: "Jared Bednar",
    DAL: "Pete DeBoer",
    DET: "Todd McLellan",
    EDM: "Kris Knoblauch",
    FLA: "Paul Maurice",
    LAK: "Jim Hiller",
    MIN: "Dean Evason",
    MTL: "Martin St. Louis",
    NJD: "Sheldon Keefe",
    NSH: "Andrew Brunette",
    NYI: "Patrick Roy",
    NYR: "Peter Laviolette",
    OTT: "Travis Green",
    PHI: "John Tortorella",
    PIT: "Mike Sullivan",
    SEA: "Dan Bylsma",
    SJS: "Ryan Warsofsky",
    STL: "Drew Bannister",
    TBL: "Jon Cooper",
    TOR: "Craig Berube",
    UTA: "André Tourigny",
    VAN: "Rick Tocchet",
    VGK: "Bruce Cassidy",
    WPG: "Scott Arniel",
    WSH: "Spencer Carbery",
  },
};

function coachesFromSeasonMap(
  map: Record<string, string>,
  season: string,
): SeedCoach[] {
  return Object.entries(map).map(([team, name]) => coach(name, team, season));
}

export function nflPersonnelSeeds(): { coaches: SeedCoach[]; starPlayers: SeedStar[] } {
  const coaches = FRICTION_SEASONS.flatMap((season) =>
    coachesFromSeasonMap(NFL_COACHES_BY_SEASON[season], season),
  );

  const starPlayers: SeedStar[] = [];
  for (const season of FRICTION_SEASONS) {
    starPlayers.push(
      star("mahompa01", "Patrick Mahomes", "KC", season, 1, 0.4),
      star("allenjo02", "Josh Allen", "BUF", season, 1, 0.5),
      star("jacksla01", "Lamar Jackson", "BAL", season, 1, 0.6),
      star("burrojo01", "Joe Burrow", "CIN", season, 1, 0.3),
      star("prescda01", "Dak Prescott", "DAL", season, 1, 0.4),
      star("hurtsja01", "Jalen Hurts", "PHI", season, 1, 0.5),
      star("stroucj01", "C.J. Stroud", "HOU", season, 1, 0.3),
      star("lawretr01", "Trevor Lawrence", "JAX", season, 1, 0.4),
      star("rodgeaa01", "Aaron Rodgers", "NYJ", season, 1, 0.2),
      star("purdybr01", "Brock Purdy", "SF", season, 1, 0.3),
      star("goffja01", "Jared Goff", "DET", season, 1, 0.2),
      star("cousiki01", "Kirk Cousins", "ATL", season, 1, 0.3),
      star("mccafcm01", "Christian McCaffrey", "SF", season, 2, 0.8),
      star("henryde01", "Derrick Henry", "BAL", season, 2, 0.7),
      star("taylosa01", "Saquon Barkley", "PHI", season, 2, 0.6),
      star("jeffeju01", "Justin Jefferson", "MIN", season, 2, 0.5),
      star("chaseja01", "Ja'Marr Chase", "CIN", season, 2, 0.4),
      star("lambce01", "CeeDee Lamb", "DAL", season, 2, 0.4),
      star("hillty01", "Tyreek Hill", "MIA", season, 2, 0.3),
      star("adamada01", "Davante Adams", "NYJ", season, 2, 0.3),
      star("kelcetr01", "Travis Kelce", "KC", season, 3, 0.5),
      star("andrewa01", "Mark Andrews", "BAL", season, 3, 0.4),
      star("kittlge01", "George Kittle", "SF", season, 3, 0.4),
      star("waddleja01", "Jaylen Waddle", "MIA", season, 3, 0.3),
      star("olavech01", "Chris Olave", "NO", season, 3, 0.3),
    );
  }

  return { coaches, starPlayers };
}

export function nhlPersonnelSeeds(): { coaches: SeedCoach[]; starPlayers: SeedStar[] } {
  const coaches = FRICTION_SEASONS.flatMap((season) =>
    coachesFromSeasonMap(NHL_COACHES_BY_SEASON[season], season),
  );

  const starPlayers: SeedStar[] = [];
  for (const season of FRICTION_SEASONS) {
    starPlayers.push(
      star("mcdavid97", "Connor McDavid", "EDM", season, 1, 1.2),
      star("matthew34", "Auston Matthews", "TOR", season, 1, 1.0),
      star("mackinn29", "Nathan MacKinnon", "COL", season, 1, 1.1),
      star("panarin10", "Artemi Panarin", "NYR", season, 1, 0.8),
      star("kucherov86", "Nikita Kucherov", "TBL", season, 1, 0.9),
      star("pastrnak88", "David Pastrnak", "BOS", season, 1, 0.9),
      star("ovechin08", "Alex Ovechkin", "WSH", season, 1, 0.7),
      star("draisait29", "Leon Draisaitl", "EDM", season, 2, 1.0),
      star("marchand63", "Brad Marchand", "BOS", season, 2, 0.9),
      star("point21", "Brayden Point", "TBL", season, 2, 0.8),
      star("mikheyev97", "Kirill Kaprizov", "MIN", season, 2, 0.9),
      star("ehlers27", "Jack Hughes", "NJD", season, 2, 0.8),
      star("shesterk30", "Igor Shesterkin", "NYR", season, 3, 0.2),
      star("vasilevskiy88", "Andrei Vasilevskiy", "TBL", season, 3, 0.2),
      star("makar08", "Cale Makar", "COL", season, 3, 0.7),
      star("fox05", "Adam Fox", "NYR", season, 3, 0.6),
    );
  }

  return { coaches, starPlayers };
}

export const NBA_STAR_SEEDS: SeedStar[] = [
  { playerId: "jokicni01", name: "Nikola Jokić", team: "DEN", season: "2024-25", usageRank: 1, seasonAvgFoulsDrawn: 4.1 },
  { playerId: "doncilu01", name: "Luka Dončić", team: "DAL", season: "2024-25", usageRank: 2, seasonAvgFoulsDrawn: 5.8 },
  { playerId: "antetgi01", name: "Giannis Antetokounmpo", team: "MIL", season: "2024-25", usageRank: 3, seasonAvgFoulsDrawn: 6.2 },
  { playerId: "gilgesh01", name: "Shai Gilgeous-Alexander", team: "OKC", season: "2024-25", usageRank: 4, seasonAvgFoulsDrawn: 5.5 },
  { playerId: "tatumja01", name: "Jayson Tatum", team: "BOS", season: "2024-25", usageRank: 5, seasonAvgFoulsDrawn: 4.4 },
  { playerId: "embiijo01", name: "Joel Embiid", team: "PHI", season: "2024-25", usageRank: 6, seasonAvgFoulsDrawn: 5.9 },
  { playerId: "curryst01", name: "Stephen Curry", team: "GSW", season: "2024-25", usageRank: 7, seasonAvgFoulsDrawn: 3.2 },
  { playerId: "duranke01", name: "Kevin Durant", team: "PHX", season: "2024-25", usageRank: 8, seasonAvgFoulsDrawn: 4.0 },
  { playerId: "edwaran01", name: "Anthony Edwards", team: "MIN", season: "2024-25", usageRank: 9, seasonAvgFoulsDrawn: 4.8 },
  { playerId: "brunsja01", name: "Jalen Brunson", team: "NYK", season: "2024-25", usageRank: 10, seasonAvgFoulsDrawn: 4.6 },
  { playerId: "jokicni01", name: "Nikola Jokić", team: "DEN", season: "2023-24", usageRank: 1, seasonAvgFoulsDrawn: 4.0 },
  { playerId: "doncilu01", name: "Luka Dončić", team: "DAL", season: "2023-24", usageRank: 2, seasonAvgFoulsDrawn: 5.6 },
  { playerId: "antetgi01", name: "Giannis Antetokounmpo", team: "MIL", season: "2023-24", usageRank: 3, seasonAvgFoulsDrawn: 6.0 },
  { playerId: "gilgesh01", name: "Shai Gilgeous-Alexander", team: "OKC", season: "2023-24", usageRank: 4, seasonAvgFoulsDrawn: 5.3 },
  { playerId: "tatumja01", name: "Jayson Tatum", team: "BOS", season: "2023-24", usageRank: 5, seasonAvgFoulsDrawn: 4.2 },
  { playerId: "embiijo01", name: "Joel Embiid", team: "PHI", season: "2023-24", usageRank: 6, seasonAvgFoulsDrawn: 5.7 },
  { playerId: "curryst01", name: "Stephen Curry", team: "GSW", season: "2023-24", usageRank: 7, seasonAvgFoulsDrawn: 3.1 },
  { playerId: "duranke01", name: "Kevin Durant", team: "PHX", season: "2023-24", usageRank: 8, seasonAvgFoulsDrawn: 3.9 },
  { playerId: "edwaran01", name: "Anthony Edwards", team: "MIN", season: "2023-24", usageRank: 9, seasonAvgFoulsDrawn: 4.7 },
  { playerId: "brunsja01", name: "Jalen Brunson", team: "NYK", season: "2023-24", usageRank: 10, seasonAvgFoulsDrawn: 4.5 },
];

export function starTierPercentile(usageRank: number): number {
  if (usageRank <= 1) return 99;
  if (usageRank <= 2) return 96;
  if (usageRank <= 3) return 93;
  return Math.max(90, 100 - usageRank);
}
