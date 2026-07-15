export type CfbOfficialRecord = {
  name: string;
  number?: number;
  role?: string;
};

export type CfbExtractedGame = {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  venue?: string;
  conference: string;
  totalPoints?: number;
  totalFouls?: number;
  officials?: CfbOfficialRecord[];
};

export type CfbExtractedGamesFile = {
  generatedAt?: string;
  conference: string;
  conferenceSlug: string;
  dryRun: boolean;
  /** When set, volume gate uses this instead of games.length (full ingest totals). */
  ingestedCount?: number;
  expectedGames?: number;
  games: CfbExtractedGame[];
};
