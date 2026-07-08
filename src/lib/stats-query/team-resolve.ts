import { NBA_TEAMS } from "@/lib/teams";

const ABBR_SET = new Set(NBA_TEAMS.map((t) => t.abbr));

const ALIASES: Record<string, string> = {
  thunder: "OKC",
  oklahoma: "OKC",
  "oklahoma city": "OKC",
  raptors: "TOR",
  toronto: "TOR",
  lakers: "LAL",
  celtics: "BOS",
  warriors: "GSW",
  "trail blazers": "POR",
  blazers: "POR",
  "76ers": "PHI",
  sixers: "PHI",
};

export function resolveTeamAbbr(input: string | null | undefined): string {
  if (!input) return "OKC";
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  if (ABBR_SET.has(upper)) return upper;

  const lower = trimmed.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];

  for (const team of NBA_TEAMS) {
    if (lower === team.name.toLowerCase()) return team.abbr;
    if (lower === team.city.toLowerCase()) return team.abbr;
    if (lower === `${team.city} ${team.name}`.toLowerCase()) return team.abbr;
  }

  return upper;
}
