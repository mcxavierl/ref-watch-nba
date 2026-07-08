/** Basketball-Reference ref×team W-L types and pure helpers (no network). */

export interface BbrRefTeamSeasonRow {
  referee: string;
  games: number;
  wins: number;
  losses: number;
}

export interface BbrRefTeamSeasonEntry {
  team: string;
  season: string;
  /** BBR URL year (e.g. 2024-25 → 2025). */
  bbrYear: number;
  referees: BbrRefTeamSeasonRow[];
}

export interface BbrRefTeamRecordsFile {
  lastUpdated: string;
  seasons: string[];
  teams: string[];
  entries: BbrRefTeamSeasonEntry[];
  stats: {
    pagesFetched: number;
    pagesFailed: number;
    refTeamPairs: number;
  };
}

export interface BbrRefTeamAggregate {
  referee: string;
  team: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
}

/** Normalize referee names for roster matching (handles Jr., punctuation, etc.). */
export function normalizeRefName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bjr\.?\b|\bsr\.?\b|\biii\b|\bii\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function seasonLabelToBbrYear(season: string): number {
  const [start] = season.split("-");
  return Number.parseInt(start, 10) + 1;
}

export function bbrYearToSeasonLabel(year: number): string {
  const start = year - 1;
  const end = String(year).slice(-2);
  return `${start}-${end}`;
}

export function aggregateBbrRefTeamRecords(
  fixture: BbrRefTeamRecordsFile,
  referee: string,
  team: string,
  seasons?: string[],
): BbrRefTeamAggregate | null {
  const norm = normalizeRefName(referee);
  const teamAbbr = team.toUpperCase();
  const seasonSet = seasons ? new Set(seasons) : null;

  let games = 0;
  let wins = 0;
  let losses = 0;
  let matched = false;

  for (const entry of fixture.entries) {
    if (entry.team !== teamAbbr) continue;
    if (seasonSet && !seasonSet.has(entry.season)) continue;
    for (const row of entry.referees) {
      if (normalizeRefName(row.referee) !== norm) continue;
      matched = true;
      games += row.games;
      wins += row.wins;
      losses += row.losses;
    }
  }

  if (!matched || games === 0) return null;
  return {
    referee,
    team: teamAbbr,
    games,
    wins,
    losses,
    winRate: Math.round((wins / games) * 1000) / 1000,
  };
}

/** Parse referee name from BBR markdown table cell (plain text or [Name](url)). */
function parseBbrRefereeCell(raw: string): string {
  const linked = raw.match(/\[([^\]]+)\]/);
  return (linked?.[1] ?? raw).trim();
}

export function parseBbrRefereesMarkdown(markdown: string): BbrRefTeamSeasonRow[] {
  const rows: BbrRefTeamSeasonRow[] = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(
      /^\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*(?:\|\s*)?(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/,
    );
    if (!match) continue;
    const referee = parseBbrRefereeCell(match[1]);
    if (referee === "Referee" || referee === "Rk") continue;
    const games = Number.parseInt(match[2], 10);
    const wins = Number.parseInt(match[3], 10);
    const losses = Number.parseInt(match[4], 10);
    if (!Number.isFinite(games) || games <= 0) continue;
    rows.push({ referee, games, wins, losses });
  }
  return rows;
}

export function countBbrRefTeamPairs(fixture: BbrRefTeamRecordsFile): number {
  const keys = new Set<string>();
  for (const entry of fixture.entries) {
    for (const row of entry.referees) {
      keys.add(`${normalizeRefName(row.referee)}|${entry.team}`);
    }
  }
  return keys.size;
}
