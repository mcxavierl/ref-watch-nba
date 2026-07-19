import type { LeagueManifestId } from "@/lib/league-manifest";

export type CommandPaletteRefEntry = {
  leagueId: LeagueManifestId;
  leagueLabel: string;
  slug: string;
  name: string;
  games: number;
  href: string;
};

export type CommandPaletteTeamEntry = {
  leagueId: LeagueManifestId;
  leagueLabel: string;
  abbr: string;
  label: string;
  href: string;
};

export type CommandPaletteIndex = {
  generatedAt: string;
  refs: CommandPaletteRefEntry[];
  teams: CommandPaletteTeamEntry[];
};
