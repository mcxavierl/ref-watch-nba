import type {
  CommandPaletteIndex,
  CommandPaletteRefEntry,
  CommandPaletteTeamEntry,
} from "@/lib/command-palette-types";

export type { CommandPaletteIndex, CommandPaletteRefEntry, CommandPaletteTeamEntry };

const INDEX_PATH = "/data/search-index.json";

let indexCache: CommandPaletteIndex | null = null;
let indexPromise: Promise<CommandPaletteIndex | null> | null = null;

function isCommandPaletteIndex(value: unknown): value is CommandPaletteIndex {
  if (!value || typeof value !== "object") return false;
  const candidate = value as CommandPaletteIndex;
  return Array.isArray(candidate.refs) && Array.isArray(candidate.teams);
}

/** Lazy-load the command palette search index from public data. */
export async function loadCommandPaletteIndex(): Promise<CommandPaletteIndex | null> {
  if (indexCache) return indexCache;
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    try {
      const res = await fetch(INDEX_PATH);
      if (!res.ok) return null;
      const data: unknown = await res.json();
      if (!isCommandPaletteIndex(data)) return null;
      indexCache = data;
      return data;
    } catch {
      return null;
    } finally {
      indexPromise = null;
    }
  })();

  return indexPromise;
}

export function commandPaletteRefValue(ref: CommandPaletteRefEntry): string {
  return `${ref.name} ${ref.slug} ${ref.leagueLabel} ${ref.leagueId} official ref referee`;
}

export function commandPaletteTeamValue(team: CommandPaletteTeamEntry): string {
  return `${team.label} ${team.abbr} ${team.leagueLabel} ${team.leagueId} team`;
}
